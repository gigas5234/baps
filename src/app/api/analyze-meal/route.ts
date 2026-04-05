import { NextResponse } from "next/server";
import { createGenAI, getGeminiModelName } from "@/lib/gemini";

const PROMPT = `너는 전문 영양사야. 이 사진 속 음식을 분석해서 반드시 아래 JSON 형식으로만 답변해줘.
한국 음식 특성을 잘 반영하고, 1인분 기준으로 영양 정보를 추정해.
여러 음식이 보이면 전체를 하나의 식사로 합산해서 답변해.

반드시 아래 JSON 형식만 반환해. 다른 텍스트는 절대 포함하지 마.
{
  "food_name": "음식 이름 (한국어)",
  "calories": 숫자,
  "carbs": 숫자,
  "protein": 숫자,
  "fat": 숫자,
  "description": "한 줄 설명"
}`;

export async function POST(request: Request) {
  try {
    const genAI = createGenAI();
    if (!genAI) {
      return NextResponse.json(
        {
          error:
            "AI API 키가 설정되지 않았습니다. Vercel에 GEMINI_API_KEY를 등록해 주세요.",
          code: "MISSING_GEMINI_KEY",
        },
        { status: 503 }
      );
    }

    const { imageBase64, mimeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "이미지가 필요합니다" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: getGeminiModelName() });

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();

    // JSON 파싱 (마크다운 코드블록 제거)
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      food_name: parsed.food_name,
      cal: Math.round(parsed.calories),
      carbs: Math.round(parsed.carbs * 10) / 10,
      protein: Math.round(parsed.protein * 10) / 10,
      fat: Math.round(parsed.fat * 10) / 10,
      description: parsed.description,
    });
  } catch (error) {
    console.error("Gemini analyze error:", error);
    return NextResponse.json(
      { error: "음식 분석에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
