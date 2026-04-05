"use client";

import { cn } from "@/lib/utils";
import type { MacroTotals } from "@/lib/meal-macros";
import {
  macroGramTargetsFromCalorieTarget,
  macroVsTargetRatio,
} from "@/lib/macro-targets";

interface MacroTargetMicroBarsProps {
  current: MacroTotals;
  targetKcal: number;
  className?: string;
}

export function MacroTargetMicroBars({
  current,
  targetKcal,
  className,
}: MacroTargetMicroBarsProps) {
  const targets = macroGramTargetsFromCalorieTarget(targetKcal);
  const r = macroVsTargetRatio(current, targets);

  const rows: {
    key: string;
    label: string;
    short: string;
    ratio: number;
    currentG: number;
    targetG: number;
    fill: string;
  }[] = [
    {
      key: "c",
      label: "탄수화물",
      short: "탄",
      ratio: r.carb,
      currentG: current.carbsG,
      targetG: targets.carbsG,
      fill: "bg-primary/80",
    },
    {
      key: "p",
      label: "단백질",
      short: "단",
      ratio: r.protein,
      currentG: current.proteinG,
      targetG: targets.proteinG,
      fill: "bg-scanner/80",
    },
    {
      key: "f",
      label: "지방",
      short: "지",
      ratio: r.fat,
      currentG: current.fatG,
      targetG: targets.fatG,
      fill: "bg-amber-500/78 dark:bg-amber-400/70",
    },
  ];

  return (
    <div className={cn("w-full space-y-2 pt-1", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        목표 대비 섭취 · 탄 / 단 / 지
      </p>
      <ul className="list-none space-y-1.5 p-0" role="list">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span
              className="w-3 shrink-0 text-center font-data text-[9px] font-bold text-muted-foreground"
              title={row.label}
            >
              {row.short}
            </span>
            <div className="min-w-0 flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-muted/80 dark:bg-muted/45">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    row.fill
                  )}
                  style={{
                    width: `${Math.round(Math.min(row.ratio, 1) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <span className="shrink-0 font-data text-[9px] tabular-nums text-muted-foreground">
              {row.currentG.toFixed(0)}/{row.targetG.toFixed(0)}g
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
