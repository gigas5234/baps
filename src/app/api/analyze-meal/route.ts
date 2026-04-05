import { NextResponse } from "next/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { createGenAI, getGeminiModelName } from "@/lib/gemini";

/**
 * Gemini 3.1 Flash-Lite: 저지연·이미지→구조화 추출에 맞춘 스키마 전용 호출.
 * @see https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-preview
 */
const mealAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    food_name: {
      type: SchemaType.STRING,
      description: "대표 음식명, 한국어, 짧게. 반상이면 한 줄로 합쳐 표기.",
    },
    calories: {
      type: SchemaType.NUMBER,
      description: "추정 총 칼로리 kcal, 1인분·한 끼 기준.",
    },
    carbs: { type: SchemaType.NUMBER, description: "탄수화물 g" },
    protein: { type: SchemaType.NUMBER, description: "단백질 g" },
    fat: { type: SchemaType.NUMBER, description: "지방 g" },
    description: {
      type: SchemaType.STRING,
      description: "한 줄 요약, 약 40자 이내, 팩트만.",
    },
  },
  required: [
    "food_name",
    "calories",
    "carbs",
    "protein",
    "fat",
    "description",
  ],
};

const VISION_PROMPT = `[작업]
사진 1장을 보고 **한 끼 식사**로 추정한 영양 값만 구조화한다. 모델 특성(Flash-Lite): 빠른 시각→필드 추출, 짧은 근거.

[규칙]
- **보이는 것만** 근거로 삼는다. 애매하면 한국 일반 분량 기준으로 **보수적** 추정(칼로리 과대 금지).
- 반찬·밥·국이 같이 있으면 **한 끼 합산**으로 food_name에 대표명을 적는다.
- 반드시 스키마 숫자 필드만 채운다. 부가 설명·마크다운 없음.

[단위]
- calories: 총 kcal
- carbs, protein, fat: 그램`;

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

    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: {
        temperature: 0.32,
        responseMimeType: "application/json",
        responseSchema: mealAnalysisSchema,
      },
    });

    const result = await model.generateContent([
      VISION_PROMPT,
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    let parsed: {
      food_name?: string;
      calories?: number;
      carbs?: number;
      protein?: number;
      fat?: number;
      description?: string;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonStr = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    }

    return NextResponse.json({
      food_name: String(parsed.food_name ?? "식사"),
      cal: Math.round(Number(parsed.calories) || 0),
      carbs: Math.round(Number(parsed.carbs) * 10) / 10,
      protein: Math.round(Number(parsed.protein) * 10) / 10,
      fat: Math.round(Number(parsed.fat) * 10) / 10,
      description: String(parsed.description ?? ""),
    });
  } catch (error) {
    console.error("Gemini analyze error:", error);
    return NextResponse.json(
      { error: "음식 분석에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
