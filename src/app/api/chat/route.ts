import { NextResponse } from "next/server";
import { createGenAI, getGeminiModelName } from "@/lib/gemini";
import {
  type CoachApiContext,
  COACH_PERSONA,
  COACH_TIME_BAND_HINT,
  bootstrapResponseSchema,
  chatResponseSchema,
  fallbackBootstrap,
  formatContextBlock,
  normalizeCoachReply,
  emptyDataCard,
  type CoachBootstrapReply,
  type CoachChatReply,
} from "@/lib/chat-coach";

function parseContext(body: Record<string, unknown>): CoachApiContext {
  const raw = body.context as Record<string, unknown> | undefined;
  const profile = (raw?.user_profile as Record<string, unknown>) ?? {};
  const macros = (raw?.macros_g as Record<string, unknown>) ?? {};

  const name = String(profile.name ?? "").trim() || "회원";
  const target_cal = Number(profile.target_cal) || 2000;
  const current_cal = Number(profile.current_cal) || 0;
  const bmr =
    profile.bmr != null && profile.bmr !== ""
      ? Number(profile.bmr)
      : null;

  const recent_meals = Array.isArray(raw?.recent_meals)
    ? (raw?.recent_meals as unknown[]).map((s) => String(s))
    : [];

  const meal_lines = Array.isArray(raw?.meal_lines)
    ? (
        raw?.meal_lines as {
          food_name?: string;
          cal?: number;
          protein_g?: number;
        }[]
      ).map((m) => ({
        food_name: String(m.food_name ?? ""),
        cal: Number(m.cal) || 0,
        protein_g: Number(m.protein_g) || 0,
      }))
    : [];

  const water_cup_ml = Number(raw?.water_cup_ml) || 250;
  const water_target_cups = Number(raw?.water_target_cups) || 8;
  const water_cups = Number(raw?.water_cups) || 0;
  const water_intake_ml = water_cups * water_cup_ml;

  const local_hour = Number(raw?.local_hour);
  const hour =
    Number.isFinite(local_hour) && local_hour >= 0 && local_hour <= 23
      ? local_hour
      : 12;

  return {
    user_profile: {
      name,
      target_cal,
      current_cal,
      bmr: Number.isFinite(bmr as number) ? (bmr as number) : null,
    },
    recent_meals,
    meal_lines,
    macros_g: {
      carbs: Number(macros.carbs) || 0,
      protein: Number(macros.protein) || 0,
      fat: Number(macros.fat) || 0,
    },
    water_intake_ml,
    water_intake_label: `${water_intake_ml}ml`,
    water_target_cups,
    water_cup_ml,
    local_hour: hour,
  };
}

function buildTranscript(
  history: { message: string; is_ai: boolean }[]
): string {
  if (!history?.length) return "";
  return history
    .map((h) => `${h.is_ai ? "코치" : "유저"}: ${h.message}`)
    .join("\n");
}

async function generateBootstrap(
  genAI: NonNullable<ReturnType<typeof createGenAI>>,
  ctx: CoachApiContext
): Promise<CoachBootstrapReply> {
  const modelName = getGeminiModelName();
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.58,
      responseMimeType: "application/json",
      responseSchema: bootstrapResponseSchema,
    },
  });

  const prompt = `${COACH_PERSONA}
${COACH_TIME_BAND_HINT}

[부트스트랩 작업 — 구조화 출력만]
- 채팅을 연 직후. 네가 **먼저** opening 한 줄(최대 2문장). 톤: **전략적 감시 코칭**(팩트·냉정·실행 압박).
- opening·quick_chips 모두 **아래 컨텍스트 숫자·메뉴명만** 근거. 없으면 추측 금지.
- quick_chips **정확히 3개**. 각 prompt에 오늘 수치(남은 kcal, 단백 g, 물 ml 등) **최소 1회**. 라벨은 단백 보충·야식·물 등 **오늘 데이터**와 연결.
- label은 약 22자 이내. prompt는 유저가 그대로 전송할 **완전한 한국어 문장**.
- 출력은 스키마 JSON뿐.

컨텍스트:
${formatContextBlock(ctx)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as CoachBootstrapReply;
  if (
    typeof parsed.opening !== "string" ||
    !Array.isArray(parsed.quick_chips)
  ) {
    throw new Error("Invalid bootstrap JSON");
  }
  return {
    opening: parsed.opening,
    quick_chips: parsed.quick_chips.slice(0, 3),
  };
}

async function generateCoachReply(
  genAI: NonNullable<ReturnType<typeof createGenAI>>,
  ctx: CoachApiContext,
  message: string,
  history: { message: string; is_ai: boolean }[]
): Promise<CoachChatReply> {
  const modelName = getGeminiModelName();
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.42,
      responseMimeType: "application/json",
      responseSchema: chatResponseSchema,
    },
  });

  const transcript = buildTranscript(history);

  const prompt = `${COACH_PERSONA}
${COACH_TIME_BAND_HINT}

[턴 응답 — 구조화 출력]
- 컨텍스트는 **최신 스냅샷**. 숫자 인용은 **여기 있는 것만**.
- **analysis / roast / mission** 필수. 각 1~2문장. 장문·설교 금지. COACH_PERSONA의 숫자·메뉴 **감싸기 규칙 준수.
- 유저가 특정 음식·행동 **허용/가능/먹어도 되나**를 묻는 경우에만 data_card 채움: headline, summary, bullets(근거 1~3, 컨텍스트 숫자 ** 인용), actions **정확히 2개**. 그 외는 ""·[].
- quick_chips **정확히 3개**: 남은 kcal·단백·지방·탄수·물·시간대와 **직접 연결**된 후속(예: 단백 추천, 야식 참기, 물 보충). prompt에 오늘 수치 **최소 1회**.

컨텍스트:
${formatContextBlock(ctx)}

지금까지 대화:
${transcript || "(없음)"}

유저: ${message}

출력은 스키마 JSON만.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed = JSON.parse(text) as CoachChatReply;
  return normalizeCoachReply(parsed);
}

export async function POST(request: Request) {
  try {
    const genAI = createGenAI();
    const body = (await request.json()) as Record<string, unknown>;
    const ctx = parseContext(body);
    const bootstrap = body.bootstrap === true;

    if (bootstrap) {
      if (!genAI) {
        const fb = fallbackBootstrap(ctx);
        return NextResponse.json(fb);
      }
      try {
        const out = await generateBootstrap(genAI, ctx);
        return NextResponse.json(out);
      } catch (e) {
        console.error("Gemini bootstrap error:", e);
        return NextResponse.json(fallbackBootstrap(ctx));
      }
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json(
        { error: "메시지가 필요합니다" },
        { status: 400 }
      );
    }

    if (!genAI) {
      return NextResponse.json(
        {
          error:
            "AI API 키가 설정되지 않았습니다. Vercel 환경 변수에 GEMINI_API_KEY(또는 GOOGLE_GENERATIVE_AI_API_KEY)를 추가해 주세요.",
          code: "MISSING_GEMINI_KEY",
        },
        { status: 503 }
      );
    }

    const history = Array.isArray(body.history)
      ? (body.history as { message: string; is_ai: boolean }[])
      : [];

    try {
      const out = await generateCoachReply(genAI, ctx, message, history);
      return NextResponse.json(out);
    } catch (error) {
      console.error("Gemini chat error:", error);
      const rem = Math.max(
        ctx.user_profile.target_cal - ctx.user_profile.current_cal,
        0
      );
      const failMsg =
        error instanceof Error
          ? `지금 AI 응답 생성에 실패했어. 로컬 데이터만 말하면 남은 여유는 **${rem}kcal**야. 잠시 후 다시 눌러봐.`
          : "응답 생성에 실패했습니다. 다시 시도해 주세요.";
      return NextResponse.json({
        analysis: "AI 엔진 응답 실패.",
        roast: "재시도 전까지는 로컬 숫자만 믿어라.",
        mission: failMsg,
        data_card: emptyDataCard(),
        quick_chips: [
          {
            label: "오늘 식단 다시 평가",
            prompt: "오늘 기록 기준으로 식단을 다시 짧게 평가해줘.",
          },
          {
            label: "남은 칼로리 알려줘",
            prompt: "오늘 남은 칼로리를 숫자로만 정리해줘.",
          },
          {
            label: "물 목표까지 얼마나?",
            prompt: "물 섭취가 목표 대비 얼마나 부족한지 말해줘.",
          },
        ],
      } satisfies CoachChatReply);
    }
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json(
      {
        error: "요청 처리에 실패했습니다.",
        detail:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : undefined
            : undefined,
      },
      { status: 500 }
    );
  }
}
