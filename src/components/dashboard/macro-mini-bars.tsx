"use client";

import { cn } from "@/lib/utils";
import type { MacroTotals } from "@/lib/meal-macros";
import {
  isFatHeavy,
  isProteinLow,
  macroCaloriePercents,
  macroKcalBreakdown,
} from "@/lib/meal-macros";

interface MacroMiniBarsProps {
  macros: MacroTotals;
  totalMealCalories: number;
}

export function MacroMiniBars({ macros, totalMealCalories }: MacroMiniBarsProps) {
  const { carb, protein, fat } = macroCaloriePercents(macros);
  const { carbKcal, proteinKcal, fatKcal, sum } = macroKcalBreakdown(macros);
  const fatWarn = isFatHeavy(macros);
  const proteinWarn = isProteinLow(macros, totalMealCalories);

  if (sum <= 0 && totalMealCalories <= 0) {
    return (
      <p className="mt-4 text-center text-[11px] text-muted-foreground dark:text-foreground/70">
        식사를 기록하면 탄·단·지 비율이 표시돼요
      </p>
    );
  }

  const rows: {
    key: string;
    label: string;
    sub: string;
    pct: number;
    fill: string;
    warn?: boolean;
  }[] = [
    {
      key: "carb",
      label: "탄수화물",
      sub: `${macros.carbsG.toFixed(0)}g · ${Math.round(carbKcal)}kcal`,
      pct: carb,
      fill: "bg-primary/85",
    },
    {
      key: "protein",
      label: "단백질",
      sub: `${macros.proteinG.toFixed(0)}g · ${Math.round(proteinKcal)}kcal`,
      pct: protein,
      fill: "bg-scanner/85",
      warn: proteinWarn,
    },
    {
      key: "fat",
      label: "지방",
      sub: `${macros.fatG.toFixed(0)}g · ${Math.round(fatKcal)}kcal`,
      pct: fat,
      fill: fatWarn ? "bg-amber-600/90" : "bg-amber-500/75",
      warn: fatWarn,
    },
  ];

  return (
    <div className="mt-5 w-full space-y-2.5 rounded-2xl border border-grid-line bg-background/40 px-3 py-3 dark:bg-background/20">
      <p className="text-[11px] font-medium text-muted-foreground">
        탄단지 분배 가이드 · 오늘 3대 영양소{" "}
        <span className="text-foreground/80">(섭취 kcal 비중)</span>
      </p>
      {fatWarn ? (
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
          지방 비중이 높아요 · 가공육·튀김 한 번 체크
        </p>
      ) : null}
      {proteinWarn ? (
        <p className="text-[11px] font-medium text-primary dark:text-primary">
          단백질이 조금 부족해 보여요
        </p>
      ) : null}
      <ul className="list-none space-y-2.5 p-0" role="list">
        {rows.map((r) => (
          <li key={r.key} className="flex gap-2.5">
            <span
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-muted-foreground/45 bg-background/80",
                "dark:border-white/35 dark:bg-transparent",
                r.warn && "border-amber-500/60 dark:border-amber-400/55"
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span
                  className={cn(
                    "font-medium",
                    r.warn && "text-amber-800 dark:text-amber-200"
                  )}
                >
                  {r.label}
                </span>
                <span className="font-data tabular-nums text-muted-foreground">
                  {Math.round(r.pct * 100)}%
                </span>
              </div>
              <div
                className={cn(
                  "h-2 overflow-hidden rounded-full bg-muted/80 dark:bg-muted/50",
                  r.warn && "ring-1 ring-amber-400/50"
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    r.fill
                  )}
                  style={{
                    width: `${Math.max(r.pct * 100, r.pct > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{r.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
