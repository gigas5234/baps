import { NextResponse } from "next/server";
import { createGenAI, getGeminiModelName } from "@/lib/gemini";

function buildSystemPrompt(context: {
  todayMeals: { food_name: string; cal: number }[];
  totalCal: number;
  targetCal: number;
  waterCups: number;
  waterCupMl?: number;
  waterTargetCups?: number;
  waterRecommendedMl?: number;
}) {
  const cupMl = context.waterCupMl ?? 250;
  const waterGoalCups = context.waterTargetCups ?? 8;
  const waterGoalMl = context.waterRecommendedMl ?? waterGoalCups * cupMl;
  const mealList = context.todayMeals.length > 0
    ? context.todayMeals.map((m) => `- ${m.food_name} (${m.cal}kcal)`).join("\n")
    : "- 아직 기록 없음";

  const remaining = Math.max(context.targetCal - context.totalCal, 0);

  return `너는 BAPS 앱의 AI 식단 상담사야. 사용자의 오늘 식단 데이터를 기반으로 솔직하고 재미있게 답변해.
팩폭(팩트 폭격) 스타일로 말하되, 상처 주지 않는 선에서 유머러스하게 해.
한국어로 답변하고, 답변은 3~4문장 이내로 짧게 해.

[오늘의 식단 현황]
${mealList}

총 섭취: ${context.totalCal}kcal / 목표: ${context.targetCal}kcal
남은 칼로리: ${remaining}kcal
물 섭취: ${context.waterCups}잔 (${context.waterCups * cupMl}ml, 1잔 ${cupMl}ml)
오늘 물 목표: 약 ${waterGoalMl}ml (목표 ${waterGoalCups}잔 기준)`;
}

export async function POST(request: Request) {
  try {
    const genAI = createGenAI();
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

    const body = await request.json();
    const { message, history } = body;
    const context = body.context ?? {
      todayMeals: [],
      totalCal: 0,
      targetCal: 2000,
      waterCups: 0,
      waterCupMl: 250,
    };

    if (!message) {
      return NextResponse.json(
        { error: "메시지가 필요합니다" },
        { status: 400 }
      );
    }

    const modelName = getGeminiModelName();
    const model = genAI.getGenerativeModel({ model: modelName });
    const systemPrompt = buildSystemPrompt(context);

    // 대화 히스토리 구성
    const chatHistory = (history || []).map(
      (h: { message: string; is_ai: boolean }) => ({
        role: h.is_ai ? "model" : "user",
        parts: [{ text: h.message }],
      })
    );

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: systemPrompt }] },
        {
          role: "model",
          parts: [
            {
              text: "네, 알겠어! 오늘 식단 데이터를 기반으로 솔직하게 상담해줄게. 뭐든 물어봐!",
            },
          ],
        },
        ...chatHistory,
      ],
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Gemini chat error:", error);
    const msg =
      error instanceof Error ? error.message : "AI 응답 생성에 실패했습니다.";
    return NextResponse.json(
      {
        error: "AI 응답 생성에 실패했습니다.",
        detail: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    );
  }
}
