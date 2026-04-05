/** 브라우저(또는 실행 환경) 로컬 타임존 기준 YYYY-MM-DD */
export function getLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 한 번만 로컬 오늘로 동기화 (전체 새로고침 시에만 다시 실행).
 * 홈 재진입 시에는 사용자가 고른 날짜를 유지하기 위함.
 */
let syncedLocalTodayThisLoad = false;

export function syncSelectedDateToLocalTodayOnce(
  setSelectedDate: (ymd: string) => void
): void {
  if (syncedLocalTodayThisLoad) return;
  syncedLocalTodayThisLoad = true;
  setSelectedDate(getLocalYmd());
}
