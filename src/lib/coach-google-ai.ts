import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getGeminiApiKey, getGeminiModelName } from "@/lib/gemini";

export function coachLanguageModel() {
  const key = getGeminiApiKey();
  if (!key) return null;
  return createGoogleGenerativeAI({ apiKey: key })(getGeminiModelName());
}

/** Gemini API safetySettings — 앱스토어·유해 콘텐츠 방어 보조 */
export const coachGoogleProviderOptions = {
  google: {
    safetySettings: [
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT" as const,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as const,
      },
      {
        category: "HARM_CATEGORY_HARASSMENT" as const,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as const,
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH" as const,
        threshold: "BLOCK_MEDIUM_AND_ABOVE" as const,
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as const,
        threshold: "BLOCK_ONLY_HIGH" as const,
      },
    ],
  },
};
