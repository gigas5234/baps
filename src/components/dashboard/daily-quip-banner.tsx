"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalorieZone } from "@/lib/calorie-zone";
import type { MacroTotals } from "@/lib/meal-macros";
import { isFatHeavy, isProteinLow, macroKcalBreakdown } from "@/lib/meal-macros";

interface DailyQuipBannerProps {
  displayName: string;
  totalCal: number;
  target: number;
  mealCount: number;
  macros: MacroTotals;
  waterCups: number;
  cupMl: number;
  /** 프로필 기반 하루 권장 물(ml) */
  waterRecommendedMl: number;
  zone: CalorieZone;
  className?: string;
}

export function DailyQuipBanner({
  displayName,
  totalCal,
  target,
  mealCount,
  macros,
  waterCups,
  cupMl,
  waterRecommendedMl,
  zone,
  className,
}: DailyQuipBannerProps) {
  const line = useMemo(() => {
    const nick = displayName?.trim() || "님";
    const waterMl = waterCups * cupMl;
    const lowWaterThreshold = Math.max(
      400,
      Math.round(Math.max(1, waterRecommendedMl) * 0.22)
    );

    if (zone === "empty" && totalCal <= 0 && mealCount === 0) {
      return `${nick}, 아직 0kcal네요? 굶는 다이어트는 결국 폭식을 부릅니다. 한 끼라도 기록해 봐요.`;
    }

    if (waterMl < lowWaterThreshold && mealCount > 0) {
      return `물 ${waterMl}ml? 오늘 권장 약 ${waterRecommendedMl.toLocaleString()}ml인데 아직 시작도 안 한 수준이에요. 컵 한 잔부터 올려요.`;
    }

    if (isFatHeavy(macros) && totalCal > 300) {
      return `오늘 지방이 상당히 올라왔어요. 기름진 메뉴는 내일로 미루는 게 어때요?`;
    }

    if (isProteinLow(macros, totalCal)) {
      return `단백질이 밀린 하루예요. 닭가슴살·두부·계란 중 하나만 더 챙겨도 달라져요.`;
    }

    if (zone === "danger") {
      return `목표 칼로리를 넘겼어요. 지금 후회하기보다 내일 아침을 가볍게 약속해요.`;
    }

    if (zone === "caution") {
      return `거의 한도선이에요. 간식은 "한 입" 규칙만 기억해요.`;
    }

    if (zone === "safe" && totalCal > 0) {
      const { sum } = macroKcalBreakdown(macros);
      if (sum > 0 && mealCount >= 2) {
        return `배분 나쁘지 않아요. 이러다 진짜 습관 됩니다.`;
      }
      return `여유 있게 가고 있어요. 기록하는 것 자체가 이미 상위 20%예요.`;
    }

    return `${nick}, 오늘도 기록 한 줄이 미래의 나한테 쪽지예요.`;
  }, [
    displayName,
    totalCal,
    mealCount,
    macros,
    waterCups,
    cupMl,
    waterRecommendedMl,
    zone,
  ]);

  return (
    <div
      className={cn(
        "relative mx-4 rounded-2xl border px-3.5 py-3 shadow-sm",
        "border-primary/15 bg-gradient-to-br from-primary/6 via-background/80 to-scanner/8",
        "backdrop-blur-md dark:from-primary/15 dark:to-scanner/12",
        className
      )}
    >
      <div className="flex gap-2.5">
        <div className="mt-0.5 shrink-0 rounded-lg bg-primary/10 p-1.5 dark:bg-primary/20">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <p className="text-sm leading-snug text-foreground/90">{line}</p>
      </div>
      <span
        className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 border-b border-r border-primary/12 bg-gradient-to-br from-primary/5 to-transparent"
        aria-hidden
      />
    </div>
  );
}
