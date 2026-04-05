"use client";

import { useRef, useEffect, useState } from "react";
import { getLocalYmd } from "@/lib/local-date";
import { useMealStore } from "@/store/use-meal-store";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 과거·당일 선택용 스트립: 이전 N일 ~ 오늘 ~ 앞 M일(비표시용 자리만, 비활성) */
function getDateRange(
  centerDate: Date,
  pastDays: number,
  futureDays: number
): Date[] {
  const dates: Date[] = [];
  for (let i = -pastDays; i <= futureDays; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function WeeklyCalendar() {
  const { selectedDate, setSelectedDate } = useMealStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);
  /** SSR 타임존 ≠ 브라우저 타임존 시 날짜 UI 불일치 → #418 방지 */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const todayStr = mounted ? getLocalYmd() : "";
  const centerDate = mounted ? new Date() : new Date(0);

  const dates = getDateRange(centerDate, 14, 3);

  useEffect(() => {
    if (!mounted || !todayStr) return;
    if (selectedDate > todayStr) setSelectedDate(todayStr);
  }, [mounted, todayStr, selectedDate, setSelectedDate]);

  useEffect(() => {
    if (!mounted) return;
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = todayRef.current;
      const scrollLeft =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "instant" });
    }
  }, [mounted, selectedDate]);

  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const monthLabel = selectedDateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  if (!mounted) {
    return (
      <div className="space-y-3">
        <div className="h-5 max-w-[12rem] rounded-md bg-muted animate-pulse" />
        <div className="flex gap-1 -mx-4 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-[58px] min-w-[36px] shrink-0 rounded-xl bg-muted/80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold text-foreground dark:text-zinc-50">
          {monthLabel}
        </p>
        {todayStr && selectedDate !== todayStr ? (
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayStr);
              todayRef.current?.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }}
            className={cn(
              "shrink-0 rounded-xl border-2 border-primary/50 bg-primary/12",
              "px-3 py-1.5 text-xs font-bold text-primary shadow-sm shadow-primary/15",
              "transition-colors active:scale-[0.98]",
              "hover:bg-primary/20 hover:border-primary"
            )}
          >
            오늘
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
      >
        {dates.map((date) => {
          const dateStr = formatDate(date);
          const dayOfWeek = date.getDay();
          const isSelected = dateStr === selectedDate;
          const isToday = !!todayStr && dateStr === todayStr;
          const isSunday = dayOfWeek === 0;
          const isFuture = !!todayStr && dateStr > todayStr;

          return (
            <button
              key={dateStr}
              type="button"
              ref={isToday ? todayRef : undefined}
              disabled={isFuture}
              onClick={() => {
                if (!isFuture) setSelectedDate(dateStr);
              }}
              className={cn(
                "flex snap-center shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 min-w-[36px] transition-all",
                isFuture &&
                  "cursor-not-allowed opacity-45 shadow-none ring-0 saturate-0",
                isSelected && !isFuture
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30"
                  : !isFuture &&
                      cn(
                        "border border-slate-300/80 bg-white/85 text-foreground shadow-sm",
                        "hover:bg-white hover:border-slate-400/90 active:scale-[0.98]",
                        "dark:border-zinc-600/85 dark:bg-zinc-800/95 dark:text-zinc-100 dark:shadow-black/25",
                        "dark:hover:border-zinc-500 dark:hover:bg-zinc-700/95"
                      ),
                isFuture &&
                  cn(
                    "border border-dashed border-muted-foreground/25 bg-muted/20 text-muted-foreground",
                    "dark:border-zinc-600/40 dark:bg-zinc-900/40"
                  )
              )}
            >
              <span
                className={cn(
                  "text-[9px] font-medium leading-none",
                  isSunday &&
                    !isSelected &&
                    !isFuture &&
                    "text-red-600 dark:text-red-400",
                  isFuture && "text-muted-foreground"
                )}
              >
                {DAY_LABELS[dayOfWeek]}
              </span>
              <span
                className={cn(
                  "text-xs font-bold leading-none tabular-nums",
                  isFuture && "text-muted-foreground"
                )}
              >
                {date.getDate()}
              </span>
              <span
                className="flex h-1 items-center justify-center"
                aria-hidden
              >
                {isToday ? (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
