"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, UtensilsCrossed, X } from "lucide-react";
import type { Meal } from "@/types/database";
import { cn } from "@/lib/utils";
import { SwipeDeleteRow } from "@/components/dashboard/swipe-delete-row";

interface MealTimelineProps {
  meals: Meal[];
  onDeleteMeal?: (meal: Meal) => void;
  isDeletingId?: string | null;
}

type DayPart = "morning" | "afternoon" | "night";

function dayPartForMeal(createdAt: string): DayPart {
  const h = new Date(createdAt).getHours();
  if (h >= 22 || h < 5) return "night";
  if (h < 12) return "morning";
  return "afternoon";
}

function isLateNightGlow(createdAt: string): boolean {
  const h = new Date(createdAt).getHours();
  return h >= 22 || h < 5;
}

const PART_LABEL: Record<
  DayPart,
  { title: string; subtitle: string }
> = {
  morning: { title: "오전", subtitle: "05:00–11:59" },
  afternoon: { title: "오후", subtitle: "12:00–21:59" },
  night: { title: "심야", subtitle: "22:00–04:59" },
};

function groupMealsByPart(meals: Meal[]): Record<DayPart, Meal[]> {
  const buckets: Record<DayPart, Meal[]> = {
    morning: [],
    afternoon: [],
    night: [],
  };
  for (const m of meals) {
    buckets[dayPartForMeal(m.created_at)].push(m);
  }
  return buckets;
}

export function MealTimeline({
  meals,
  onDeleteMeal,
  isDeletingId,
}: MealTimelineProps) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/20 py-12 text-muted-foreground">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <p className="text-sm font-medium">검거 로그가 비어 있어요</p>
        <p className="mt-1 text-center text-xs text-muted-foreground/90">
          사진을 찍어 기록하면 타임라인에 표시됩니다
        </p>
      </div>
    );
  }

  const grouped = groupMealsByPart(meals);
  const order: DayPart[] = ["morning", "afternoon", "night"];

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {order.map((part) => {
          const partMeals = grouped[part];
          if (partMeals.length === 0) return null;

          return (
            <motion.div
              key={part}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <div className="flex items-baseline gap-2 px-0.5">
                <Radar className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {PART_LABEL[part].title} 구간
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {PART_LABEL[part].subtitle}
                  </p>
                </div>
              </div>

              <ul className="list-none space-y-2.5 p-0" role="list">
                {partMeals.map((meal, i) => {
                  const time = new Date(meal.created_at).toLocaleTimeString(
                    "ko-KR",
                    { hour: "2-digit", minute: "2-digit" }
                  );
                  const night = isLateNightGlow(meal.created_at);
                  const canSwipe = Boolean(onDeleteMeal);
                  const busy = isDeletingId === meal.id;

                  const row = (
                    <div
                      className={cn(
                        "relative flex items-center gap-3 rounded-2xl border p-3 pr-10 shadow-sm transition-[box-shadow,border-color]",
                        night
                          ? "border-red-500/35 bg-card shadow-[0_0_20px_-4px_rgba(239,68,68,0.42)] dark:border-red-400/28 dark:shadow-[0_0_22px_-4px_rgba(248,113,113,0.35)]"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                        {meal.image_url ? (
                          <Image
                            src={meal.image_url}
                            alt={meal.food_name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xl">
                            🍽️
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-end gap-x-2 gap-y-0.5">
                          <p className="font-data text-xl font-bold tabular-nums leading-none text-foreground">
                            {meal.cal}
                            <span className="ml-0.5 text-xs font-semibold text-muted-foreground">
                              kcal
                            </span>
                          </p>
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {time}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">
                          {meal.food_name}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0 font-data text-[11px] font-semibold tabular-nums text-foreground/85">
                          <span>탄 {Number(meal.carbs)}g</span>
                          <span>단 {Number(meal.protein)}g</span>
                          <span>지 {Number(meal.fat)}g</span>
                        </div>
                      </div>

                      {onDeleteMeal ? (
                        <button
                          type="button"
                          disabled={busy}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => onDeleteMeal(meal)}
                          className={cn(
                            "absolute right-2 top-2 rounded-lg p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/12 hover:text-destructive",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            busy && "pointer-events-none opacity-40"
                          )}
                          aria-label={`${meal.food_name} 기록 삭제`}
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                        </button>
                      ) : null}
                    </div>
                  );

                  return (
                    <motion.li
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.22, delay: i * 0.03 }}
                    >
                      {canSwipe ? (
                        <SwipeDeleteRow
                          onDelete={() => onDeleteMeal?.(meal)}
                          disabled={busy}
                        >
                          {row}
                        </SwipeDeleteRow>
                      ) : (
                        row
                      )}
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
