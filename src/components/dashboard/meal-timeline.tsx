"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import type { Meal } from "@/types/database";

interface MealTimelineProps {
  meals: Meal[];
}

export function MealTimeline({ meals }: MealTimelineProps) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium">아직 식단 기록이 없어요</p>
        <p className="text-xs mt-1">사진을 찍어서 기록해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {meals.map((meal, i) => {
          const time = new Date(meal.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <motion.div
              key={meal.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
            >
              {/* Thumbnail (1:1) */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                {meal.image_url ? (
                  <Image
                    src={meal.image_url}
                    alt={meal.food_name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl">
                    🍽️
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {meal.food_name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{time}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <div className="flex gap-1.5 text-[10px] text-muted-foreground">
                    <span>탄 {meal.carbs}g</span>
                    <span>단 {meal.protein}g</span>
                    <span>지 {meal.fat}g</span>
                  </div>
                </div>
              </div>

              {/* Calories badge */}
              <div className="bg-muted rounded-xl px-3 py-1.5 shrink-0">
                <p className="text-sm font-bold tabular-nums">{meal.cal}</p>
                <p className="text-[9px] text-muted-foreground text-center">
                  kcal
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
