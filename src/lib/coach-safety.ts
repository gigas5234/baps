import type {
  CoachApiContext,
  EmergencyNutritionTrigger,
} from "@/lib/chat-coach";

/** 당일 기록 칼로리가 BMR 대비 이 비율 미만이면 저섭취 보호 (14시 이후만 적용) */
export const EMERGENCY_CAL_RATIO_OF_BMR_TODAY = 0.5;

/** 최근 3일 일평균 섭취가 BMR 대비 이 비율 미만이면 추이 기반 보호 */
export const EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG = 0.7;

/** local_hour 기준: 이 시각 이전에는 BMR 기반 당일 저섭취 플래그 비활성 */
export const LOW_INTAKE_TODAY_MIN_LOCAL_HOUR = 14;

/** 목표 칼로리 대비 당일 진행률 — 오후 늦게 약한 경고 */
export const PACE_MILD_MAX_PROGRESS = 0.4;

/** 목표 칼로리 대비 당일 진행률 — 야간 저섭취 경고 */
export const PACE_SEVERE_MAX_PROGRESS = 0.6;

export function computeEmergencyNutrition(input: {
  bmr: number | null;
  target_cal: number;
  current_cal: number;
  recent_three_day_cal_average: number | null;
  /** 로컬 시(0–23). 오전 공복은 정상으로 두고 오후 이후부터 당일 BMR 게이트 */
  local_hour: number;
}): { active: boolean; triggers: EmergencyNutritionTrigger[] } {
  const triggers: EmergencyNutritionTrigger[] = [];
  const bmr = input.bmr;
  if (bmr == null || !Number.isFinite(bmr) || bmr < 600) {
    return { active: false, triggers: [] };
  }

  const h =
    Number.isFinite(input.local_hour) &&
    input.local_hour >= 0 &&
    input.local_hour <= 23
      ? Math.trunc(input.local_hour)
      : 12;
  const target =
    Number.isFinite(input.target_cal) && input.target_cal > 0
      ? input.target_cal
      : 0;
  const cur = Number.isFinite(input.current_cal) ? input.current_cal : 0;
  const pctTarget = target > 0 ? cur / target : 0;

  const avg = input.recent_three_day_cal_average;
  if (
    avg != null &&
    Number.isFinite(avg) &&
    avg < bmr * EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG
  ) {
    triggers.push("low_intake_3d_avg");
  }

  if (
    h >= LOW_INTAKE_TODAY_MIN_LOCAL_HOUR &&
    cur < bmr * EMERGENCY_CAL_RATIO_OF_BMR_TODAY
  ) {
    triggers.push("low_intake_today");
  }

  if (target > 0 && h >= 21 && pctTarget < PACE_SEVERE_MAX_PROGRESS) {
    triggers.push("intake_pace_severe");
  } else if (
    target > 0 &&
    h >= 16 &&
    h < 21 &&
    pctTarget < PACE_MILD_MAX_PROGRESS
  ) {
    triggers.push("intake_pace_mild");
  }

  return SortTriggers(triggers);
}

/** 심각도·프롬프트 순서용 */
function SortTriggers(
  triggers: EmergencyNutritionTrigger[]
): { active: boolean; triggers: EmergencyNutritionTrigger[] } {
  const order: EmergencyNutritionTrigger[] = [
    "low_intake_3d_avg",
    "intake_pace_severe",
    "low_intake_today",
    "intake_pace_mild",
  ];
  const set = new Set(triggers);
  const sorted = order.filter((t) => set.has(t));
  return { active: sorted.length > 0, triggers: sorted };
}

/** @deprecated computeEmergencyNutrition 사용 */
export function isEmergencyNutritionMode(
  ctx: Pick<
    CoachApiContext,
    "user_profile" | "recent_three_day_cal_average" | "local_hour"
  >
): boolean {
  return computeEmergencyNutrition({
    bmr: ctx.user_profile.bmr,
    target_cal: ctx.user_profile.target_cal,
    current_cal: ctx.user_profile.current_cal,
    recent_three_day_cal_average: ctx.recent_three_day_cal_average ?? null,
    local_hour: ctx.local_hour ?? LOW_INTAKE_TODAY_MIN_LOCAL_HOUR,
  }).active;
}

/** Gemini 프롬프트 — 트리거별 톤 보강 */
export function emergencyNutritionGuardPrompt(
  ctx: Pick<
    CoachApiContext,
    | "emergency_triggers"
    | "user_profile"
    | "recent_three_day_cal_average"
    | "local_hour"
  >
): string {
  const triggers = ctx.emergency_triggers ?? [];
  if (!triggers.length) return "";

  const bmr = ctx.user_profile.bmr ?? 0;
  const tgt = ctx.user_profile.target_cal ?? 0;
  const cur = ctx.user_profile.current_cal ?? 0;
  const pct =
    tgt > 0 && Number.isFinite(cur) ? Math.round((cur / tgt) * 100) : null;
  const h = ctx.local_hour ?? 12;

  const parts: string[] = [
    `
[긴급·저섭취 보호 — 서버 트리거]
발동: ${triggers.join(", ")} · 로컬 시각 대략 **${h}시**`,
  ];

  if (h >= 5 && h < 12 && !triggers.includes("low_intake_today")) {
    parts.push(
      `- **오전(05–12h)**: 공복·미기록은 **정상 설계 구간**으로 볼 수 있다. 「기아」「즉시 섭취 강제」 표현 금지. **오늘 목표 대비 첫 끼·시간 분배** 같은 전략 톤 우선.`
    );
  }

  if (triggers.includes("low_intake_today")) {
    parts.push(
      `- **당일 BMR 대비** 기록 섭취가 **${Math.round(EMERGENCY_CAL_RATIO_OF_BMR_TODAY * 100)}%** 미만(**${LOW_INTAKE_TODAY_MIN_LOCAL_HOUR}시 이후**에만 이 조건을 쓴다).`
    );
  }
  if (triggers.includes("low_intake_3d_avg")) {
    const avg = ctx.recent_three_day_cal_average;
    parts.push(
      `- **최근 3일 일평균** 약 **${avg != null ? Math.round(avg) : "?"}kcal/일** — BMR의 **${Math.round(EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG * 100)}%** 미만. **아침에도** 추이는 경고한다. 의도한 감량 vs 기록 누락을 구분해 말하고, **근손실·대사 저하** 리스크와 **균형 식사·수면·전문가 상담**을 짧게 권한다.`
    );
  }
  if (triggers.includes("intake_pace_mild")) {
    parts.push(
      `- **일일 진행률**(목표 대비): 약 **${pct ?? "?"}%** — 16~20시 구간에서 목표의 **${Math.round(PACE_MILD_MAX_PROGRESS * 100)}%** 미만이면 **가벼운 보정** 프레임(「조금 느림」). 압박·조롱 금지.`
    );
  }
  if (triggers.includes("intake_pace_severe")) {
    parts.push(
      `- **일일 진행률**(목표 대비): 약 **${pct ?? "?"}%** — **21시 이후** 목표의 **${Math.round(PACE_SEVERE_MAX_PROGRESS * 100)}%** 미만이면 **저섭취·야간 보정** 경고 수준. 짧은 보고체·실행 한 가지 제안.`
    );
  }

  parts.push(`
[톤 — analysis / opening]
- 3~5개의 **짧은 문장** 보고서체. 교과서식 장문 금지.
- **당일 0kcal·저섭취 예시(권장)**: 「현재 **${cur}kcal**. 에너지 대시보드 **적자** 구간—**${tgt}kcal** 목표까지 **소량·균형**으로 먼저 채우는 편이 관제상 유리. 기록 누락 가능성은 한 줄로 점검.」
- **금지 예시**: 「기아 모드 진입」「즉시 먹지 않으면 대사 정지」 같은 **공포·단정**.
- **intake_pace_mild**일 땐 **근심 1 + 저녁 보정 1문장** 정도. **intake_pace_severe**·**low_intake_today**는 더 직설적이되 조롱·굶음 조장 금지.

공통:
- coach_quips·quick_chips는 **안전·사실·작은 실행** 위주.
- **의료·영양 전문가** 상담을 한 번은 자연스럽게 권한다(진단 단정 금지).
- BMR **${Math.round(bmr)}kcal** · 목표 **${Math.round(tgt)}kcal** (프로필 기준).`);

  return parts.join("\n");
}
