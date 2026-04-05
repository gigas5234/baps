import type { FrequentMeal } from "@/types/database";

export type MealTimeBand = "morning" | "lunch" | "dinner" | "other";

/** 현재 시간이 속하는 식사대 (KST 로컬 시계 기준) */
export function getMealTimeBandForHour(hour: number): MealTimeBand {
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 18 && hour < 22) return "dinner";
  return "other";
}

function bandFromDate(d: Date): MealTimeBand {
  return getMealTimeBandForHour(d.getHours());
}

/**
 * 자주 찾는 식단 카드 순서: 같은 시간대에 마지막으로 먹은 항목을 가중,
 * 그다음 전체 빈도(count). 최대 limit개.
 */
export function rankFrequentMealsForNow(
  items: FrequentMeal[],
  now: Date = new Date(),
  limit = 5
): FrequentMeal[] {
  if (items.length === 0) return [];

  const currentBand = bandFromDate(now);

  const scored = items.map((m) => {
    const last = new Date(m.last_eaten_at);
    const lastBand = bandFromDate(last);
    const bandMatch = lastBand === currentBand && currentBand !== "other";
    const score =
      Number(m.count) * (bandMatch ? 2.2 : 1) + (bandMatch ? 3 : 0);
    return { m, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (
      new Date(b.m.last_eaten_at).getTime() -
      new Date(a.m.last_eaten_at).getTime()
    );
  });

  return scored.slice(0, limit).map((s) => s.m);
}
