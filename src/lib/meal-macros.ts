import type { Meal } from "@/types/database";

/** 탄·단·지 g 표시 — 부동소수점 오차 제거, 필요 시 소수 첫째 자리까지 */
export function formatMacroGrams(g: number): string {
  const n = Number(g);
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10) / 10;
  const s = rounded.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** 식사 항목 kcal 한 줄 표시 */
export function formatMealItemKcal(kcal: number): string {
  const n = Number(kcal);
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

export interface MacroTotals {
  carbsG: number;
  proteinG: number;
  fatG: number;
}

export function sumMealMacros(meals: Meal[]): MacroTotals {
  return meals.reduce(
    (acc, m) => ({
      carbsG: acc.carbsG + Number(m.carbs),
      proteinG: acc.proteinG + Number(m.protein),
      fatG: acc.fatG + Number(m.fat),
    }),
    { carbsG: 0, proteinG: 0, fatG: 0 }
  );
}

/** 탄수·단백·지방에서 오는 kcal (4/4/9) */
export function macroKcalBreakdown(t: MacroTotals) {
  const carbKcal = t.carbsG * 4;
  const proteinKcal = t.proteinG * 4;
  const fatKcal = t.fatG * 9;
  const sum = carbKcal + proteinKcal + fatKcal;
  return { carbKcal, proteinKcal, fatKcal, sum };
}

/** 총 kcal 대비 각 매크로 비율 (0~1). macro kcal 합이 0이면 균등 0 */
export function macroCaloriePercents(t: MacroTotals): {
  carb: number;
  protein: number;
  fat: number;
} {
  const { carbKcal, proteinKcal, fatKcal, sum } = macroKcalBreakdown(t);
  if (sum <= 0) return { carb: 0, protein: 0, fat: 0 };
  return {
    carb: carbKcal / sum,
    protein: proteinKcal / sum,
    fat: fatKcal / sum,
  };
}

/** 지방 에너지 비중이 높음 (대략 38% 초과) */
export function isFatHeavy(t: MacroTotals): boolean {
  const p = macroCaloriePercents(t);
  return p.fat > 0.38 && macroKcalBreakdown(t).sum > 50;
}

/** 단백질 비중 낮음 (~15% 미만, 일정 칼로리 이상일 때만) */
export function isProteinLow(t: MacroTotals, totalMealCal: number): boolean {
  if (totalMealCal < 400) return false;
  const p = macroCaloriePercents(t);
  return p.protein < 0.15 && macroKcalBreakdown(t).sum > 80;
}
