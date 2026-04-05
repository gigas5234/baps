import { NextResponse } from "next/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import { createGenAI, getGeminiModelName } from "@/lib/gemini";

export const maxDuration = 60;

const MAX_IMAGE_BASE64_CHARS = 8_500_000;

const analyzableItemSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    food_name: {
      type: SchemaType.STRING,
      description: "개별 음식·반찬명, 한국어. 예: 밥, 된장찌개, 김치.",
    },
    calories: { type: SchemaType.NUMBER, description: "이 항목 분량 kcal" },
    carbs: { type: SchemaType.NUMBER, description: "탄수화물 g" },
    protein: { type: SchemaType.NUMBER, description: "단백질 g" },
    fat: { type: SchemaType.NUMBER, description: "지방 g" },
  },
  required: ["food_name", "calories", "carbs", "protein", "fat"],
};

const mealAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: analyzableItemSchema,
      description:
        "사진에 구분되는 **각 음식마다 1행**. 밥·국·반찬은 분리. 한 종류만 보이면 원소 1개.",
    },
    description: {
      type: SchemaType.STRING,
      description: "이 한 끼 전체 한 줄 요약, 약 40자.",
    },
  },
  required: ["items", "description"],
};

const VISION_PROMPT = `[작업]
사진 1장에서 **보이는 음식별로** 영양을 나눠 구조화한다. 한 끼에 여러 품목이 있으면 items에 각각 나열한다.

[규칙]
- 보이는 것만 근거. 애매하면 한국 일반 분량으로 **보수적** 추정(칼로리 과대 금지).
- 밥·메인·반찬·국·음료가 함께 보이면 **항목을 분리**한다. 합쳐서 한 줄 food_name 금지(항목마다 고유 food_name).
- 각 items[].calories는 **그 항목만**의 kcal이며, 모든 항목 합이 한 끼 총칼로리다.

[단위]
- calories: kcal, carbs/protein/fat: g`;

type RawItem = {
  food_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
};

function normalizeItems(parsed: { items?: RawItem[]; description?: string }): {
  items: {
    food_name: string;
    cal: number;
    carbs: number;
    protein: number;
    fat: number;
  }[];
  description: string;
  food_name: string;
} {
  const raw = Array.isArray(parsed.items) ? parsed.items : [];
  const mapped = raw.map((row) => {
    const food_name = String(row?.food_name ?? "").trim() || "음식";
    const cal = Math.max(0, Math.round(Number(row?.calories) || 0));
    const carbs = Math.max(0, Math.round(Number(row?.carbs) * 10) / 10);
    const protein = Math.max(0, Math.round(Number(row?.protein) * 10) / 10);
    const fat = Math.max(0, Math.round(Number(row?.fat) * 10) / 10);
    return { food_name, cal, carbs, protein, fat };
  });

  let chosen = mapped.filter(
    (x) => x.cal > 0 || x.carbs > 0 || x.protein > 0 || x.fat > 0
  );
  if (chosen.length === 0 && mapped.length > 0) {
    chosen = [mapped[0]];
  }
  if (chosen.length === 0) {
    chosen = [
      {
        food_name: "식사",
        cal: 0,
        carbs: 0,
        protein: 0,
        fat: 0,
      },
    ];
  }

  const totalCal = chosen.reduce((s, x) => s + x.cal, 0);
  const label =
    chosen.length === 1
      ? chosen[0].food_name
      : `${chosen[0]?.food_name ?? "식사"} 외 ${chosen.length - 1}품 (${totalCal}kcal)`;

  return {
    items: chosen,
    description: String(parsed.description ?? ""),
    food_name: label,
  };
}

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedSupabaseUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

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

    if (typeof imageBase64 !== "string" || !imageBase64) {
      return NextResponse.json(
        { error: "이미지가 필요합니다" },
        { status: 400 }
      );
    }

    if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return NextResponse.json(
        { error: "이미지 크기가 너무 큽니다." },
        { status: 413 }
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
    let parsed: { items?: RawItem[]; description?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonStr = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    }

    const out = normalizeItems(parsed);
    return NextResponse.json(out);
  } catch (error) {
    console.error("Gemini analyze error:", error);
    return NextResponse.json(
      { error: "음식 분석에 실패했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
