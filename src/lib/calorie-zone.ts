export type CalorieZone = "empty" | "safe" | "caution" | "danger";

export function getCalorieZone(current: number, target: number): CalorieZone {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  if (current <= 0 || percentage <= 0) return "empty";
  if (percentage > 100) return "danger";
  if (percentage > 80) return "caution";
  return "safe";
}
