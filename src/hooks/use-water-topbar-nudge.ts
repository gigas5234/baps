"use client";

import { useEffect, useMemo, useState } from "react";
import { getLocalYmd } from "@/lib/local-date";
import { getWaterLastAdjustMs } from "@/lib/water-reminder-storage";

const REMINDER_AFTER_MS = 2.5 * 60 * 60 * 1000;
/** 첫 넛지는 이 시간 이후(로컬)부터 — 자정 직후 과도한 알림 방지 */
const MIN_HOUR_FIRST = 9;

type UseWaterTopBarNudgeArgs = {
  userId: string | null | undefined;
  selectedDate: string;
  mealCount: number;
  waterCups: number;
  cupMl: number;
  recommendedMl: number;
};

/**
 * 오늘 날짜·로그인 상태에서, 물 기록(클라 조작)이 한동안 없고 목표 대비 여유가 있을 때
 * 탑바에 은은한 수분 리마인더 표시 여부.
 */
export function useWaterTopBarNudge({
  userId,
  selectedDate,
  mealCount,
  waterCups,
  cupMl,
  recommendedMl,
}: UseWaterTopBarNudgeArgs): boolean {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    void tick;
    if (!userId || selectedDate !== getLocalYmd()) return false;
    if (recommendedMl <= 0 || cupMl <= 0) return false;
    if (mealCount < 1) return false;

    const waterMl = Math.max(0, waterCups) * cupMl;
    if (waterMl >= recommendedMl * 0.92) return false;

    const belowMid = waterMl < recommendedMl * 0.55;
    if (!belowMid) return false;

    const last = getWaterLastAdjustMs(userId, selectedDate);
    const now = Date.now();

    if (last != null) {
      return now - last >= REMINDER_AFTER_MS;
    }

    return new Date().getHours() >= MIN_HOUR_FIRST;
  }, [
    userId,
    selectedDate,
    mealCount,
    waterCups,
    cupMl,
    recommendedMl,
    tick,
  ]);
}
