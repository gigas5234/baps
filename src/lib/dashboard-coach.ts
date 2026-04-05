import type { CalorieZone } from "@/lib/calorie-zone";
import { isFatHeavy, isProteinLow, type MacroTotals } from "@/lib/meal-macros";

export function buildDashboardNextAction(
  zone: CalorieZone,
  currentKcal: number,
  targetKcal: number,
  macros: MacroTotals | null
): string {
  const left = Math.max(targetKcal - currentKcal, 0);
  if (zone === "empty") {
    return "첫 기록을 남기면 오늘 작전 상황판이 가동됩니다.";
  }
  if (zone === "danger") {
    return "다음 끼니는 가벼운 채소·단백 위주로 200~300kcal만 권장합니다.";
  }
  if (macros && isProteinLow(macros, currentKcal)) {
    const k = left > 0 ? Math.min(300, Math.max(180, Math.round(left * 0.35))) : 280;
    return `다음 식사는 단백질 위주로 ${k}kcal 이내가 적당합니다.`;
  }
  if (macros && isFatHeavy(macros)) {
    return "지방 비중이 높습니다. 다음 끼니는 구이·삶음 위주로 조정해 보세요.";
  }
  if (zone === "caution") {
    return `남은 ${left.toLocaleString()}kcal로 단백질·채소 비중을 맞춰 보세요.`;
  }
  return "여유가 있습니다. 균형 잡힌 한 끼를 이어가도 안전 구역입니다.";
}

export function buildLiveSignalLine(
  zone: CalorieZone,
  currentKcal: number,
  mealCount: number,
  macros: MacroTotals | null
): string {
  if (zone === "empty") {
    return "BAPS 관측 · 아직 입력 신호가 없습니다. 영양 레이더 대기 중.";
  }
  if (mealCount === 0) {
    return "BAPS 관측 · 기록이 비어 있습니다.";
  }
  if (zone === "danger") {
    return "BAPS 관측 · 일일 한도 초과. 감시 강도 상승.";
  }
  if (zone === "caution") {
    return "BAPS 관측 · 한도 근접. 다음 섭취를 분할·축소하세요.";
  }
  if (macros && isProteinLow(macros, currentKcal)) {
    return "BAPS 관측 · 단백질 궤적이 목표 대비 낮습니다.";
  }
  if (macros && isFatHeavy(macros)) {
    return "BAPS 관측 · 지방 에너지 비중이 높게 포착되었습니다.";
  }
  return "BAPS 관측 · 오늘 칼로리·매크로 궤적이 안정 구간입니다.";
}
