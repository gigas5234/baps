/** 브라우저(또는 실행 환경) 로컬 타임존 기준 YYYY-MM-DD */
export function getLocalYmd(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 로컬 달력 하루(00:00:00.000 ~ 23:59:59.999)를 UTC ISO로 변환.
 * DB meals.created_at(timestamptz) 필터와 클라이언트 표시 날짜를 맞출 때 사용.
 * ( naive `YYYY-MM-DDT00:00:00` 문자열은 PG에서 UTC 자정으로 해석되어 새벽 식사가 전날로 밀리는 문제가 있음 )
 */
export function localYmdToUtcRangeIso(ymd: string): {
  start: string;
  end: string;
} {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(`${ymd}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
}

/** 로컬 달력 기준으로 YMD 가감 */
export function ymdAddCalendarDays(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return getLocalYmd(d);
}

/** /api/chat 등 — 로컬 선택일 기준 식사 조회용 UTC 경계(이틀 전 자정 ~ 선택일 끝) */
export function mealUtcBoundsForCoachApi(selectedYmd: string): {
  range_start: string;
  day_start: string;
  day_end: string;
} {
  return {
    range_start: localYmdToUtcRangeIso(ymdAddCalendarDays(selectedYmd, -2))
      .start,
    day_start: localYmdToUtcRangeIso(selectedYmd).start,
    day_end: localYmdToUtcRangeIso(selectedYmd).end,
  };
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
