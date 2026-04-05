import type { CoachApiContext } from "@/lib/chat-coach";
import type { CoachPersonaId } from "@/lib/coach-personas";

const LATE_HOUR_START = 22;
const EARLY_HOUR_END = 5;
const FAT_KCAL_SHARE_MIN = 0.42;
const MACRO_KCAL_FLOOR = 80;

/**
 * LLM 오케스트레이션 전에 반드시 포함할 코치 0~2명 (토큰 절약).
 * 나머지 슬롯은 모델이 채운다 (최대 3명까지 coach_quips).
 */
export function pickRuleBasedCoachSlots(ctx: CoachApiContext): CoachPersonaId[] {
  const locked: CoachPersonaId[] = [];

  if (ctx.emergency_nutrition_mode && !locked.includes("mental")) {
    locked.push("mental");
  }

  const h = ctx.local_hour;
  /** 심야·새벽: 운동 강요 대신 멘탈/생체리듬·야식 욕구 프레임 */
  if (
    (h >= LATE_HOUR_START || h < EARLY_HOUR_END) &&
    locked.length < 2 &&
    !locked.includes("mental")
  ) {
    locked.push("mental");
  }

  const { carbs, protein, fat } = ctx.macros_g;
  const fk = fat * 9;
  const ck = carbs * 4;
  const pk = protein * 4;
  const sum = fk + ck + pk;
  if (
    sum >= MACRO_KCAL_FLOOR &&
    fk / sum >= FAT_KCAL_SHARE_MIN &&
    locked.length < 2 &&
    !locked.includes("nutrition")
  ) {
    locked.push("nutrition");
  }

  return locked.slice(0, 2);
}

export function ruleLockedCoachPromptLines(
  locked: CoachPersonaId[],
  mode: "bootstrap" | "chat"
): string {
  if (locked.length === 0) return "";
  const ids = locked.join(", ");
  if (mode === "bootstrap") {
    return `
[규칙 선발 코치 — 토큰 절약]
선정된 관점: ${ids} — **opening**·**quick_chips** 문장에 위 코치들의 초점이 자연스럽게 스며들게 한다(별도 coach_quips JSON 필드 없음).
22~05시엔 **멘탈·수면·리듬** 프레임, 즉시 운동 강요 금지.`;
  }
  return `
[규칙 선발 코치 — 토큰 절약]
아래 persona_id는 서버 규칙으로 선정됨. 스트리밍 **[태그]** 프로토콜에서 해당 코치 태그 블록에 **한 문장**씩 채운다.
선정된 id: ${ids}
그 외 코치는 **[DIET]·[NUTRITION]·[EXERCISE]·[MENTAL]·[ROI]** 중 **최대 ${Math.max(0, 3 - locked.length)}개** 태그까지 추가 가능. 코치 태그 합 1~3개.`;
}

/** 22~05시 멘탈 코치 톤 — 수면·호르몬·운동 강요 금지 */
export function lateNightBioRhythmCue(): string {
  return `
[22:00~05:00 심야·새벽 — BAPS 바이오 감시]
**멘탈** 블록은 **수면·생체리듬·야식 욕구(단순 배고픔과 구분되는 신호)** 프레임으로 쓴다.
**즉시 고강도 운동(스쿼트·달리기 강요)** 금지. "지금 운동"보다 **수면·회복·리듬** 쪽이 데이터상 합리적일 수 있음을 짚는다.
팩폭 방향 예: 지금 먹고 싶은 건 **호르몬·리듬의 장난**일 수 있고, **운동보다 수면**이 시급할 수 있다—야식 합리화가 아니라 **감시 데이터 톤**.`;
}
