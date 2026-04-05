export const WEIGHT_STORAGE_KEY = "baps-weight-entries-v1";
const STORAGE_KEY = WEIGHT_STORAGE_KEY;

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

/** 같은 날은 덮어쓰기, 최대 maxKeep개만 유지(오래된 것 삭제). 표시는 최신 7개만 씀. */
export function upsertWeightEntry(
  date: string,
  kg: number,
  maxKeep = 365
): WeightEntry[] {
  const prev = loadWeightEntries().filter((e) => e.date !== date);
  const next = [...prev, { date, kg }];
  next.sort((a, b) => a.date.localeCompare(b.date));
  const trimmed =
    next.length > maxKeep ? next.slice(next.length - maxKeep) : next;
  saveWeightEntries(trimmed);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("baps-weight-storage"));
  }
  return trimmed;
}

/** 최근 n개 **기록(날짜 단위)** — 날짜순 정렬 후 마지막 n개 */
export function lastNWeightEntries(n: number): WeightEntry[] {
  const all = loadWeightEntries().sort((a, b) => a.date.localeCompare(b.date));
  return all.length <= n ? all : all.slice(-n);
}

/** 차트용: 입력한 날짜만, 최대 maxPoints개(기본 7), 최신 기준 */
export function getChartWeightEntries(maxPoints = 7): WeightEntry[] {
  return lastNWeightEntries(maxPoints);
}
