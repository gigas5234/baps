import type { Gender } from "@/types/database";

export interface WaterGoalInputs {
  /** kg */
  weightKg: number | null | undefined;
  gender: Gender | null | undefined;
  age: number | null | undefined;
  /** kcal — 있으면 목표 칼로리 대비 BMR 비율로 활동 보정 */
  bmr: number | null | undefined;
  /** 목표 칼로리 — 활동량 프록시 */
  targetCal: number;
}

/**
 * 하루 권장 음수(무만이 아니라 일반 가이드에 맞춘 음료 목표 ml).
 * - 체중 32~35ml/kg(성별)
 * - 체중 없으면 성별 기본값
 * - 65세 이상 약 8% 감소
 * - 목표 칼로리가 높으면 소폭 가산(활동)
 */
export function getRecommendedWaterMl(input: WaterGoalInputs): number {
  const { weightKg, gender, age, bmr, targetCal } = input;

  let ml: number;

  if (
    weightKg != null &&
    !Number.isNaN(Number(weightKg)) &&
    weightKg > 20 &&
    weightKg < 300
  ) {
    const perKg = gender === "male" ? 35 : 32;
    ml = Number(weightKg) * perKg;
  } else {
    ml = gender === "male" ? 2450 : 2050;
  }

  if (age != null && age >= 65) {
    ml *= 0.92;
  }

  if (
    bmr != null &&
    Number.isFinite(bmr) &&
    bmr >= 800 &&
    bmr <= 4500 &&
    targetCal > 0
  ) {
    const r = targetCal / bmr;
    if (r >= 1.12) {
      ml += Math.min(280, (r - 1.12) * 520);
    } else if (r <= 0.88) {
      ml *= 0.97;
    }
  }

  if (targetCal >= 2600) {
    ml += Math.min(350, (targetCal - 2200) * 0.12);
  } else if (targetCal > 0 && targetCal < 1400) {
    ml *= 0.94;
  }

  return Math.round(Math.min(4000, Math.max(1550, ml)));
}

/**
 * 권장 ml을 1잔 용량으로 나눈 목표 잔 수 (올림, 최소 4잔)
 */
export function getWaterTargetCups(recommendedMl: number, cupMl: number): number {
  if (!Number.isFinite(cupMl) || cupMl < 50) {
    return Math.max(4, Math.ceil(2000 / 250));
  }
  const raw = Math.ceil(recommendedMl / cupMl);
  return Math.max(4, raw);
}
