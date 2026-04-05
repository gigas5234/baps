"use client";

import { motion } from "framer-motion";
import { Droplets, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterCounterProps {
  cups: number;
  /** 1잔당 ml (설정에서 변경) */
  cupMl?: number;
  /** 권장 기준으로 계산된 목표 잔 수 */
  targetCups: number;
  /** 계산에 쓴 권장 ml (표시용) */
  recommendedMl: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isUpdating?: boolean;
}

export function WaterCounter({
  cups,
  cupMl = 250,
  targetCups,
  recommendedMl,
  onIncrement,
  onDecrement,
  isUpdating,
}: WaterCounterProps) {
  const safeTarget = Math.max(1, targetCups);
  const percentage = Math.min((cups / safeTarget) * 100, 100);
  const totalMl = cups * cupMl;
  const goalMl = safeTarget * cupMl;
  const canDecrement = cups > 0 && !isUpdating;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/25 p-4 shadow-md",
        "bg-card/65 backdrop-blur-xl dark:border-white/10 dark:bg-card/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative w-10 h-10 shrink-0 rounded-xl bg-scanner/15 flex items-center justify-center dark:bg-scanner/20">
          <Droplets className="w-5 h-5 text-scanner" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">물 섭취</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            목표 {safeTarget}잔 · {goalMl.toLocaleString()}ml
          </p>
          <p className="text-[10px] text-muted-foreground/90 mt-0.5 leading-snug">
            권장 약 {recommendedMl.toLocaleString()}ml (체중·성별·나이·BMR·목표 칼로리)
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-scanner rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* − / 잔 수 / + : 넓은 터치 영역, 실수로 +만 누르기 어렵게 분리 */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={!canDecrement}
          aria-label="1잔 빼기"
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-background text-foreground shadow-sm transition-transform active:scale-95",
            "disabled:opacity-35 disabled:pointer-events-none",
            "hover:bg-muted/80"
          )}
        >
          <Minus className="w-5 h-5 stroke-[2.5]" aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center px-2 text-center">
          <span className="font-data text-2xl font-bold tabular-nums tracking-tight">
            {cups}
          </span>
          <span className="text-xs text-muted-foreground">
            1잔 {cupMl}ml · 누적 {totalMl}ml
          </span>
        </div>

        <button
          type="button"
          onClick={onIncrement}
          disabled={isUpdating}
          aria-label="1잔 더하기"
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-scanner text-scanner-foreground shadow-md shadow-scanner/25 transition-transform active:scale-95",
            "disabled:opacity-50 disabled:pointer-events-none",
            "hover:brightness-95 dark:hover:brightness-110"
          )}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
