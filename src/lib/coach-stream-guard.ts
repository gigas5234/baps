/** 스트리밍 코치 응답이 프로토콜을 벗어난 JSON/누수인지 감지 */

const TAG_AT_START =
  /^\[(ANALYSIS|MISSION|INVITE|DIET|NUTRITION|EXERCISE|MENTAL|ROI|QUICK_CHIPS|DATA_CARD)]/i;

export const COACH_STREAM_FALLBACK_MESSAGE =
  "🚨 코치들이 야식을 보고 너무 놀라 말이 안 나오나 봅니다. 잠시 후 다시 분석합니다.";

/** 완료된 스트림 또는 누적 청크가 깨진 JSON·코드펜스로 시작하는지 */
export function coachStreamIsCorruptLeak(raw: string, streamFinished: boolean): boolean {
  const t = raw.trimStart();
  if (!t) return false;

  if (
    t.startsWith("{") ||
    t.startsWith("```") ||
    /^\{\s*"/.test(t) ||
    /^"\s*(analysis|reply|opening)\s*"\s*:/i.test(t)
  ) {
    return true;
  }

  if (t.startsWith("[")) {
    if (TAG_AT_START.test(t)) return false;
    if (streamFinished) return true;
    if (/^\[\s*[\{"']/.test(t)) return true;
  }

  return false;
}

/** 분석/응답 문자열이 잘못 파싱되어 JSON 덩어리가 들어온 경우 */
export function coachTextLooksLikeJsonLeak(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  if (s.startsWith("{") || s.startsWith("[{")) return true;
  if (/^"\w+"\s*:\s*[\[{"']/.test(s)) return true;
  return false;
}
