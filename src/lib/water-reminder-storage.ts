/** 클라이언트: 물 잔 조절 시각 기록 (탑바 리마인더용). DB에 updated_at 없을 때 보조. */

const KEY = (userId: string, dateYmd: string) =>
  `baps_water_last_adjust_${userId}_${dateYmd}`;

export function touchWaterLastAdjust(userId: string, dateYmd: string): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY(userId, dateYmd), String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function getWaterLastAdjustMs(
  userId: string,
  dateYmd: string
): number | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY(userId, dateYmd));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
