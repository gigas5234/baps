const STORAGE_KEY = "baps-weight-entries-v1";

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg: number;
}

export function loadWeightEntries(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WeightEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) =>
        e &&
        typeof e.date === "string" &&
        typeof e.kg === "number" &&
        e.kg > 0 &&
        e.kg < 500
    );
  } catch {
    return [];
  }
}

export function saveWeightEntries(entries: WeightEntry[]): void {
  if (typeof window === "undefined") return;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
}

/** 같은 날은 덮어쓰기, 최대 maxKeep개만 유지(오래된 것 삭제) */
export function upsertWeightEntry(
  date: string,
  kg: number,
  maxKeep = 14
): WeightEntry[] {
  const prev = loadWeightEntries().filter((e) => e.date !== date);
  const next = [...prev, { date, kg }];
  next.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed =
    next.length > maxKeep ? next.slice(next.length - maxKeep) : next;
  saveWeightEntries(trimmed);
  return trimmed;
}

/** 최근 n일(데이터 있는 날만) 연속이 아니어도 표시용 */
export function lastNWeightEntries(n: number): WeightEntry[] {
  const all = loadWeightEntries();
  return all.slice(-n);
}
