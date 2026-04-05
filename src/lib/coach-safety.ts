import type {
  CoachApiContext,
  EmergencyNutritionTrigger,
} from "@/lib/chat-coach";

/** 당일 기록 칼로리가 BMR 대비 이 비율 미만이면 저섭취 보호 */
export const EMERGENCY_CAL_RATIO_OF_BMR_TODAY = 0.5;

/** 최근 3일 일평균 섭취가 BMR 대비 이 비율 미만이면 추이 기반 보호 */
export const EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG = 0.7;

export function computeEmergencyNutrition(input: {
  bmr: number | null;
  current_cal: number;
  recent_three_day_cal_average: number | null;
}): { active: boolean; triggers: EmergencyNutritionTrigger[] } {
  const triggers: EmergencyNutritionTrigger[] = [];
  const bmr = input.bmr;
  if (bmr == null || !Number.isFinite(bmr) || bmr < 600) {
    return { active: false, triggers: [] };
  }

  if (
    Number.isFinite(input.current_cal) &&
    input.current_cal < bmr * EMERGENCY_CAL_RATIO_OF_BMR_TODAY
  ) {
    triggers.push("low_intake_today");
  }

  const avg = input.recent_three_day_cal_average;
  if (
    avg != null &&
    Number.isFinite(avg) &&
    avg < bmr * EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG
  ) {
    triggers.push("low_intake_3d_avg");
  }

  return { active: triggers.length > 0, triggers };
}

/** @deprecated computeEmergencyNutrition 사용 */
export function isEmergencyNutritionMode(
  ctx: Pick<CoachApiContext, "user_profile">
): boolean {
  return (
    ctx.user_profile.bmr != null &&
    Number.isFinite(ctx.user_profile.bmr) &&
    ctx.user_profile.bmr >= 600 &&
    Number.isFinite(ctx.user_profile.current_cal) &&
    ctx.user_profile.current_cal <
      ctx.user_profile.bmr * EMERGENCY_CAL_RATIO_OF_BMR_TODAY
  );
}

/** Gemini 프롬프트 — 트리거별 톤 보강 */
export function emergencyNutritionGuardPrompt(
  ctx: Pick<
    CoachApiContext,
    "emergency_triggers" | "user_profile" | "recent_three_day_cal_average"
  >
): string {
  const triggers = ctx.emergency_triggers ?? [];
  if (!triggers.length) return "";

  const bmr = ctx.user_profile.bmr ?? 0;
  const parts: string[] = [
    `
[🚨 긴급 보호 모드 — 서버 강제]
다음 조건 중 하나 이상에 해당한다: ${triggers.join(", ")}.`,
  ];

  if (triggers.includes("low_intake_today")) {
    parts.push(
      `- **오늘** 기록 섭취가 BMR의 **${Math.round(EMERGENCY_CAL_RATIO_OF_BMR_TODAY * 100)}%** 미만이다.`
    );
  }
  if (triggers.includes("low_intake_3d_avg")) {
    const avg = ctx.recent_three_day_cal_average;
    parts.push(
      `- **최근 3일 일평균** 섭취가 대략 **${avg != null ? Math.round(avg) : "?"}kcal/일** 수준으로 BMR의 **${Math.round(EMERGENCY_CAL_RATIO_OF_BMR_3D_AVG * 100)}%** 미만이다. **이성적 분석관 모드**: 신체가 **에너지 부족(기아 반응)** 구간에 접어들었을 수 있다—**의도한 감량인지, 기록 누락인지** 구분해 말한다. **근손실·대사 저하** 리스크를 차분히 설명하고, **균형 잡힌 식사·수면·전문가 상담**을 권한다.`
    );
  }

  parts.push(`
공통:
- **독설·팩폭·굶음 조장·수치로 압박** 금지. 조롱·자극 금지.
- coach_quips·quick_chips도 **안전·사실·작은 실행** 위주.
- **의료·영양 전문가** 상담을 한 번은 자연스럽게 권한다(진단 단정 금지).
- BMR 참고값: **${Math.round(bmr)}kcal** (프로필 기준).`);

  return parts.join("\n");
}
