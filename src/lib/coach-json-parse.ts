/** 스트리밍 합쳐진 문자열에서 JSON 한 덩어리 추출 */
export function stripJsonFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```\s*$/im.exec(t);
  if (fence) return fence[1].trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```\w*\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  return t;
}

export function parseCoachJson<T>(raw: string): T {
  const s = stripJsonFences(raw);
  return JSON.parse(s) as T;
}
