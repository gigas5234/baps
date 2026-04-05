import { streamText } from "ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import {
  buildCoachApiContext,
  isValidApiDate,
  type MealUtcBounds,
} from "@/lib/chat-context-server";
import {
  fallbackBootstrap,
  emptyDataCard,
  type CoachChatReply,
} from "@/lib/chat-coach";
import { buildAiCoachBootstrapPrompt, buildAiCoachChatPrompt } from "@/lib/coach-prompts";
import {
  coachGoogleProviderOptions,
  coachLanguageModel,
} from "@/lib/coach-google-ai";
import { parseCoachPersonaId, type CoachPersonaId } from "@/lib/coach-personas";
import { pickInterventionGuestsForChat } from "@/lib/coach-intervention-triggers";

const MAX_USER_MESSAGE_CHARS = 8_000;
const MAX_HISTORY_LINE_CHARS = 6_000;

function parseMealUtcBounds(
  body: Record<string, unknown>
): MealUtcBounds | null {
  const b = body.meal_utc_bounds;
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const range_start =
    typeof o.range_start === "string" ? o.range_start.trim() : "";
  const day_start =
    typeof o.day_start === "string" ? o.day_start.trim() : "";
  const day_end = typeof o.day_end === "string" ? o.day_end.trim() : "";
  if (!range_start || !day_start || !day_end) return null;
  return { range_start, day_start, day_end };
}

function parseTimeZone(body: Record<string, unknown>): string | null {
  const t =
    typeof body.time_zone === "string"
      ? body.time_zone.trim()
      : typeof (body as { timeZone?: unknown }).timeZone === "string"
        ? String((body as { timeZone: string }).timeZone).trim()
        : "";
  return t || null;
}

function parseLocalHourHint(body: Record<string, unknown>): number | undefined {
  const lh =
    body.local_hour ??
    (body.context as Record<string, unknown> | undefined)?.local_hour;
  if (typeof lh === "number" && Number.isFinite(lh)) return lh;
  if (typeof lh === "string" && lh.trim() !== "") {
    const n = Number(lh);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parseHistory(
  raw: unknown
): { message: string; is_ai: boolean }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-12)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const message =
        typeof o.message === "string"
          ? o.message.slice(0, MAX_HISTORY_LINE_CHARS)
          : "";
      return { message, is_ai: Boolean(o.is_ai) };
    })
    .filter((h): h is { message: string; is_ai: boolean } => h != null);
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedSupabaseUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const rawDate =
      typeof body.date === "string"
        ? body.date.trim()
        : typeof (body.context as Record<string, unknown> | undefined)?.date ===
            "string"
          ? String((body.context as Record<string, unknown>).date).trim()
          : "";
    const date = isValidApiDate(rawDate) ? rawDate : "";
    if (!date) {
      return NextResponse.json(
        { error: "날짜(date)가 필요합니다.", code: "BAD_DATE" },
        { status: 400 }
      );
    }

    const ctx = await buildCoachApiContext(
      supabase,
      user.id,
      date,
      parseLocalHourHint(body),
      parseMealUtcBounds(body),
      parseTimeZone(body)
    );
    if (!ctx) {
      return NextResponse.json(
        {
          error: "프로필을 불러오지 못했습니다. 온보딩을 완료해 주세요.",
          code: "PROFILE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const model = coachLanguageModel();
    const bootstrap = body.bootstrap === true;
    const coachId = parseCoachPersonaId(body.coach_id ?? body.coachId);

    if (bootstrap) {
      if (!model) {
        return NextResponse.json(fallbackBootstrap(ctx));
      }
      try {
        const result = streamText({
          model,
          prompt: buildAiCoachBootstrapPrompt(ctx, coachId),
          temperature: 0.58,
          providerOptions: coachGoogleProviderOptions,
        });
        return result.toTextStreamResponse({
          headers: {
            "X-Baps-Coach-Stream": "bootstrap",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } catch (e) {
        console.error("Gemini bootstrap stream error:", e);
        return NextResponse.json(fallbackBootstrap(ctx));
      }
    }

    const message =
      typeof body.message === "string"
        ? body.message.trim().slice(0, MAX_USER_MESSAGE_CHARS)
        : "";
    if (!message) {
      return NextResponse.json(
        { error: "메시지가 필요합니다" },
        { status: 400 }
      );
    }

    if (!model) {
      return NextResponse.json(
        {
          error:
            "AI API 키가 설정되지 않았습니다. Vercel 환경 변수에 GEMINI_API_KEY(또는 GOOGLE_GENERATIVE_AI_API_KEY)를 추가해 주세요.",
          code: "MISSING_GEMINI_KEY",
        },
        { status: 503 }
      );
    }

    const history = parseHistory(body.history);

    const interventionGuests = pickInterventionGuestsForChat(
      ctx,
      message,
      coachId
    );

    try {
      const result = streamText({
        model,
        prompt: buildAiCoachChatPrompt(
          ctx,
          message,
          history,
          coachId,
          interventionGuests
        ),
        temperature: 0.42,
        providerOptions: coachGoogleProviderOptions,
      });
      return result.toTextStreamResponse({
        headers: {
          "X-Baps-Coach-Stream": "chat",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.error("Gemini chat stream error:", error);
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
        roast: "",
        mission: failMsg,
        coach_quips: [
          {
            persona_id: "diet" as CoachPersonaId,
            zinger:
              error instanceof Error
                ? "엔진 오류—남은 칼로리만 믿고 잠시 후 재시도해라."
                : "응답 실패. 다시 시도해라.",
          },
        ],
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
      } satisfies CoachChatReply,
        { status: 503 }
      );
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
