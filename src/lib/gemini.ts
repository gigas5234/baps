import { GoogleGenerativeAI } from "@google/generative-ai";

/** Vercel/로컬에서 허용하는 환경 변수 이름 (AI Studio 키) */
export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

/** 기본: Gemini 3.1 Flash-Lite (Preview). 운영에서 바꾸려면 GEMINI_MODEL 환경 변수 사용. */
export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite-preview";
}

export function createGenAI(): GoogleGenerativeAI | null {
  const key = getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

/**
 * 직접 입력(음식명 텍스트) → 영양 추정용 시스템 지시.
 * `/api/analyze-food-text`와 동일한 톤을 유지할 때 이 상수를 붙여 씀.
 */
export const ANALYZE_FOOD_TEXT_INSTRUCTION = `너는 대한민국 최고의 영양 분석 AI다.

사용자가 입력한 음식 이름(한국어·분량 표현 포함)을 보고, 일반적인 1인분·한 끼 기준으로 추정해.
반드시 스키마 JSON만 출력한다. 다른 문장·마크다운 금지.

- 칼로리(kcal), 탄수화물(g), 단백질(g), 지방(g)을 현실적인 한국 통계·일반 분량에 맞게 추정한다.
- 입력이 지나치게 모호하면(예: "고기", "반찬"만): needs_clarification=true, clarification_message에 한국어로 되물음(예: 삼겹살 vs 닭가슴살 등 왜 구체화가 필요한지), food_name은 사용자 입력을 정리한 짧은 표기, calories·carbs·protein·fat는 0, description은 빈 문자열.
- 명확하면 needs_clarification=false, clarification_message는 빈 문자열, 숫자를 채운다.
- description은 한 줄 코멘트(나트륨·지방 등 짧은 감시자 톤 허용), 80자 이내.`;
