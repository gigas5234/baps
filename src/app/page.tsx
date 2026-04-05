"use client";

import { QuickActionButton } from "@/components/common/quick-action-button";
import { ChatFab } from "@/components/common/chat-fab";
import { WeeklyCalendar } from "@/components/dashboard/weekly-calendar";
import { CalorieGauge } from "@/components/dashboard/calorie-gauge";
import { MealTimeline } from "@/components/dashboard/meal-timeline";
import { WaterCounter } from "@/components/dashboard/water-counter";
import { useMealStore } from "@/store/use-meal-store";
import { useProfileStore } from "@/store/use-profile-store";
import { useMeals, useWaterLog, useAddWater, useDailyCalories } from "@/lib/queries";

export default function HomePage() {
  const { selectedDate } = useMealStore();
  const { userName, targetCal } = useProfileStore();

  // TODO: 실제 user ID는 Supabase auth에서 가져와야 함
  const userId: string | undefined = undefined;

  const { data: meals = [] } = useMeals(userId, selectedDate);
  const { data: waterLog } = useWaterLog(userId, selectedDate);
  const addWater = useAddWater(userId, selectedDate);
  const totalCalories = useDailyCalories(meals);

  const target = targetCal || 2000;

  return (
    <main className="flex-1 pb-28 max-w-md mx-auto w-full">
      {/* Header */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">BAPS</h1>
          <p className="text-sm text-muted-foreground">
            {userName ? `${userName}님, 오늘도 건강하게!` : "오늘도 건강하게!"}
          </p>
        </div>
      </header>

      {/* Weekly Calendar */}
      <section className="px-4 py-2">
        <WeeklyCalendar />
      </section>

      {/* Calorie Gauge */}
      <section className="px-4 py-3">
        <CalorieGauge current={totalCalories} target={target} />
      </section>

      {/* Water Counter */}
      <section className="px-4 py-2">
        <WaterCounter
          cups={waterLog?.cups ?? 0}
          onAdd={() => addWater.mutate(waterLog?.cups ?? 0)}
          isAdding={addWater.isPending}
        />
      </section>

      {/* Meal Timeline */}
      <section className="px-4 py-3">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          오늘 먹은 것
        </h2>
        <MealTimeline meals={meals} />
      </section>

      {/* Floating Actions */}
      <QuickActionButton
        onWater={() => addWater.mutate(waterLog?.cups ?? 0)}
      />
      <ChatFab />
    </main>
  );
}
