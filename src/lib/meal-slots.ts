/**
 * 끼니 슬롯(Bucket) — DB meal_slot · 타임라인 · DnD 공통
 */

export const MEAL_SLOT_IDS = [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "latenight",
] as const;

export type MealSlot = (typeof MEAL_SLOT_IDS)[number];

export const MEAL_SLOT_SECTION: Record<
  MealSlot,
  { title: string; hint: string; badge: string; emoji: string }
> = {
  breakfast: {
    title: "아침",
    hint: "07:00–09:00 권장",
    badge: "아침",
    emoji: "🌅",
  },
  lunch: {
    title: "점심",
    hint: "12:00–14:00 권장",
    badge: "점심",
    emoji: "☀️",
  },
  snack: {
    title: "간식",
    hint: "간식 · 디저트",
    badge: "간식",
    emoji: "🥤",
  },
  dinner: {
    title: "저녁",
    hint: "18:00–20:00 권장",
    badge: "저녁",
    emoji: "🌙",
  },
  latenight: {
    title: "야식",
    hint: "늦은 야식",
    badge: "야식",
    emoji: "🌃",
  },
};

/** 로컬 시각 기준 슬롯 (meal-timeline과 동일한 시간대 경계) */
export function mealSlotFromLocalDate(d: Date): MealSlot {
  const h = d.getHours();
  if (h >= 22 || h < 5) return "latenight";
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 17) return "snack";
  if (h < 22) return "dinner";
  return "latenight";
}

/** 선택한 달력일 + 슬롯 대표 시각 → ISO (UTC). 드래그 드롭·수동 기본값. */
export function defaultEatenAtIsoForSlot(slot: MealSlot, ymd: string): string {
  const mid: Record<MealSlot, [number, number]> = {
    breakfast: [8, 0],
    lunch: [12, 30],
    snack: [15, 30],
    dinner: [19, 0],
    latenight: [23, 0],
  };
  const [hh, mm] = mid[slot];
  const pad = (n: number) => String(n).padStart(2, "0");
  return new Date(`${ymd}T${pad(hh)}:${pad(mm)}:00`).toISOString();
}

/** EXIF 시각의 시·분·초를 선택 일(ymd)의 로컬 날짜에 합성 */
export function mergeExifTimeOntoSelectedYmd(
  exifLocal: Date,
  selectedYmd: string
): Date {
  const merged = new Date(`${selectedYmd}T12:00:00`);
  merged.setHours(
    exifLocal.getHours(),
    exifLocal.getMinutes(),
    exifLocal.getSeconds(),
    exifLocal.getMilliseconds()
  );
  return merged;
}

export function isLateNightSlot(slot: MealSlot): boolean {
  return slot === "latenight";
}

export function parseMealSlot(raw: string | null | undefined): MealSlot | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim() as MealSlot;
  return (MEAL_SLOT_IDS as readonly string[]).includes(s) ? s : null;
}
