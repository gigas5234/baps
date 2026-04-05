"use client";

import { useRef, useEffect } from "react";
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
  const todayStr = formatDate(new Date());

  // 오늘을 기준으로 앞뒤 14일
  const dates = getDateRange(new Date(), 14);

  // 초기 마운트 시 선택된 날짜(오늘)로 스크롤
  useEffect(() => {
    if (todayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = todayRef.current;
      const scrollLeft =
        el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: "instant" });
    }
  }, []);

  // 현재 월 표시
  const selectedDateObj = new Date(selectedDate);
  const monthLabel = selectedDateObj.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        {selectedDate !== todayStr && (
          <button
            onClick={() => {
              setSelectedDate(todayStr);
              todayRef.current?.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }}
            className="text-xs text-primary font-medium"
          >
            오늘
          </button>
        )}
      </div>

      {/* Scrollable dates */}
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory"
      >
        {dates.map((date) => {
          const dateStr = formatDate(date);
          const dayOfWeek = date.getDay();
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isSunday = dayOfWeek === 0;

          return (
            <button
              key={dateStr}
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
              {/* Today indicator dot */}
              {isToday && (
                <div
                  className={cn(
                    "w-1 h-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
