import type { MacroTotals } from "@/lib/meal-macros";

/** 일일 목표 kcal 기준 균형형 매크로 목표(g) — 에너지 비율 탄 50% · 단 25% · 지 25% */
export function macroGramTargetsFromCalorieTarget(targetKcal: number): MacroTotals {
  if (targetKcal <= 0) return { carbsG: 0, proteinG: 0, fatG: 0 };
  return {
    carbsG: (targetKcal * 0.5) / 4,
    proteinG: (targetKcal * 0.25) / 4,
    fatG: (targetKcal * 0.25) / 9,
  };
}

/** 목표 대비 비율 (시각화용: 상한 1 = 가득 찬 바) */
export function macroVsTargetRatio(
  current: MacroTotals,
  target: MacroTotals
): { carb: number; protein: number; fat: number } {
  const cap = (c: number, t: number) =>
    t > 0.001 ? Math.min(c / t, 1) : c > 0 ? 1 : 0;
  return {
    carb: cap(current.carbsG, target.carbsG),
    protein: cap(current.proteinG, target.proteinG),
    fat: cap(current.fatG, target.fatG),
  };
}
