import type { Meal } from "@/types/database";
import {
  mealSlotFromLocalDate,
  parseMealSlot,
  type MealSlot,
} from "@/lib/meal-slots";

/** meal_group_id 기준으로 트레이(한 끼) 묶음 */
export function clusterMealsByGroup(meals: Meal[]): Meal[][] {
  const map = new Map<string, Meal[]>();
  for (const m of meals) {
    const g = m.meal_group_id ?? m.id;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(m);
  }
  return [...map.values()].map((arr) =>
    [...arr].sort(
      (a, b) =>
        new Date(a.eaten_at).getTime() - new Date(b.eaten_at).getTime()
    )
  );
}

export function slotForTray(tray: Meal[]): MealSlot {
  const head = tray[0];
  if (!head) return "lunch";
  const parsed = parseMealSlot(head.meal_slot);
  if (parsed) return parsed;
  return mealSlotFromLocalDate(new Date(head.eaten_at));
}

export function traysIntoBuckets(meals: Meal[]): Record<MealSlot, Meal[][]> {
  const empty: Record<MealSlot, Meal[][]> = {
    breakfast: [],
    lunch: [],
    snack: [],
    dinner: [],
    latenight: [],
  };
  const trays = clusterMealsByGroup(meals);
  for (const tray of trays) {
    const s = slotForTray(tray);
    empty[s].push(tray);
  }
  for (const k of Object.keys(empty) as MealSlot[]) {
    empty[k].sort(
      (a, b) =>
        new Date(a[0].eaten_at).getTime() -
        new Date(b[0].eaten_at).getTime()
    );
  }
  return empty;
}

export function sumTrayCal(tray: Meal[]): number {
  return tray.reduce((s, m) => s + (Number(m.cal) || 0), 0);
}
