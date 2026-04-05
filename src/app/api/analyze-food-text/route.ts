import { NextResponse } from "next/server";
import { SchemaType, type Schema } from "@google/generative-ai";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import {
  lookupNutritionCacheFuzzy,
  normalizeNutritionKey,
  upsertNutritionCacheRow,
} from "@/lib/nutrition-dictionary";
import {
  createGenAI,
  getGeminiModelName,
  ANALYZE_FOOD_TEXT_INSTRUCTION,
} from "@/lib/gemini";

const MAX_QUERY_CHARS = 800;

const foodTextSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    food_name: { type: SchemaType.STRING },
    calories: { type: SchemaType.NUMBER },
    carbs: { type: SchemaType.NUMBER },
    protein: { type: SchemaType.NUMBER },
    fat: { type: SchemaType.NUMBER },
    description: { type: SchemaType.STRING },
    needs_clarification: {
      type: SchemaType.BOOLEAN,
      description: "입력이 너무 모호하면 true",
    },
    clarification_message: {
      type: SchemaType.STRING,
      description: "모호할 때만 한국어 안내. 아니면 빈 문자열.",
    },
  },
  required: [
    "food_name",
    "calories",
    "carbs",
    "protein",
    "fat",
    "description",
    "needs_clarification",
    "clarification_message",
  ],
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedSupabaseUser();
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
            "AI API 키가 설정되지 않았습니다. GEMINI_API_KEY 등을 설정해 주세요.",
          code: "MISSING_GEMINI_KEY",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const raw = typeof body.query === "string" ? body.query.trim() : "";
    const query = raw.slice(0, MAX_QUERY_CHARS);
    if (!query) {
      return NextResponse.json(
        { error: "음식 이름을 입력해 주세요." },
        { status: 400 }
      );
    }

    const dictKey = normalizeNutritionKey(query);
    const fromCache = await lookupNutritionCacheFuzzy(supabase, query);
    if (fromCache) {
      return NextResponse.json({
        food_name: fromCache.food_name_display,
        cal: fromCache.cal,
        carbs: fromCache.carbs,
        protein: fromCache.protein,
        fat: fromCache.fat,
        description: "",
        needs_clarification: false,
        clarification_message: "",
        cached: true,
      });
    }

    const model = genAI.getGenerativeModel({
      model: getGeminiModelName(),
      generationConfig: {
        temperature: 0.35,
        responseMimeType: "application/json",
        responseSchema: foodTextSchema,
      },
    });

    const prompt = `${ANALYZE_FOOD_TEXT_INSTRUCTION}

사용자 입력: "${query}"`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonStr = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(jsonStr);
    }

    const food_name = String(parsed.food_name ?? "");
    const cal = Math.round(Number(parsed.calories) || 0);
    const carbs = Math.round(Number(parsed.carbs) * 10) / 10;
    const protein = Math.round(Number(parsed.protein) * 10) / 10;
    const fat = Math.round(Number(parsed.fat) * 10) / 10;
    const needs_clarification = Boolean(parsed.needs_clarification);

    if (!needs_clarification && food_name && cal > 0) {
      void upsertNutritionCacheRow(supabase, dictKey, {
        food_name_display: food_name,
        cal,
        carbs,
        protein,
        fat,
        source: "gemini",
      });
    }

    return NextResponse.json({
      food_name,
      cal,
      carbs,
      protein,
      fat,
      description: String(parsed.description ?? ""),
      needs_clarification,
      clarification_message: String(parsed.clarification_message ?? ""),
      cached: false,
    });
  } catch (error) {
    console.error("analyze-food-text error:", error);
    return NextResponse.json(
      { error: "음식 분석에 실패했습니다. 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
