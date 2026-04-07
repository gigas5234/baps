/** Azure Neural TTS용 SSML 이스케이프·조립 (서버 REST · 브라우저 SDK 공통) */

const MAX_TTS_CHARS = 4000;

export function escapeForSsml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * 코치 음성·속도 프로파일로 SSML 한 덩어리 생성.
 * `voiceName`·`prosodyRate`는 이미 신뢰 가능한 상수라도 SSML 속성값은 이스케이프한다.
 */
export function buildCoachNeuralSsml(
  text: string,
  voiceName: string,
  prosodyRate: string,
  xmlLang = "ko-KR"
): string {
  const safeText = escapeForSsml(text.slice(0, MAX_TTS_CHARS));
  const safeVoice = escapeForSsml(voiceName);
  const safeRate = escapeForSsml(prosodyRate);
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeForSsml(xmlLang)}"><voice name="${safeVoice}"><prosody rate="${safeRate}">${safeText}</prosody></voice></speak>`;
}
