import { GoogleGenerativeAI } from "@google/generative-ai";

/** Vercel/로컬에서 허용하는 환경 변수 이름 (AI Studio 키) */
export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
}

export function createGenAI(): GoogleGenerativeAI | null {
  const key = getGeminiApiKey();
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}
