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

function getDateRange(centerDate: Date, range: number): Date[] {
  const dates: Date[] = [];
  for (let i = -range; i <= range; i++) {
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

  const dates = getDateRange(centerDate, 14);

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
              className="min-w-[44px] h-[72px] rounded-2xl bg-muted/80 animate-pulse shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold text-foreground">{monthLabel}</p>
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

          return (
            <button
              key={dateStr}
              type="button"
              ref={isToday ? todayRef : undefined}
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "flex flex-col items-center gap-1.5 min-w-[44px] py-2.5 px-1 rounded-2xl transition-all snap-center shrink-0",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "hover:bg-muted active:scale-95"
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isSunday && !isSelected && "text-red-400"
                )}
              >
                {DAY_LABELS[dayOfWeek]}
              </span>
              <span className="text-sm font-bold">{date.getDate()}</span>
              {isToday ? (
                <div
                  className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
