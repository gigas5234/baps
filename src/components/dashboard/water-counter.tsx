"use client";

import { motion } from "framer-motion";
import { Droplets, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaterCounterProps {
  cups: number;
  onIncrement: () => void;
  onDecrement: () => void;
  isUpdating?: boolean;
}

const TARGET_CUPS = 8; // 하루 목표: 8잔 (2L)

export function WaterCounter({
  cups,
  onIncrement,
  onDecrement,
  isUpdating,
}: WaterCounterProps) {
  const percentage = Math.min((cups / TARGET_CUPS) * 100, 100);
  const canDecrement = cups > 0 && !isUpdating;

  return (
    <div className="bg-card rounded-2xl p-4 shadow-sm border">
      <div className="flex items-start gap-3">
        <div className="relative w-10 h-10 shrink-0 rounded-xl bg-cyan-50 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-cyan-500" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">물 섭취</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            목표 {TARGET_CUPS}잔 · {cups * 250}ml
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-cyan-400 rounded-full"
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
          <span className="text-2xl font-bold tabular-nums tracking-tight">
            {cups}
          </span>
          <span className="text-xs text-muted-foreground">잔 (1잔 250ml)</span>
        </div>

        <button
          type="button"
          onClick={onIncrement}
          disabled={isUpdating}
          aria-label="1잔 더하기"
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500 text-white shadow-md shadow-cyan-500/25 transition-transform active:scale-95",
            "disabled:opacity-50 disabled:pointer-events-none",
            "hover:bg-cyan-600"
          )}
        >
          <Plus className="w-5 h-5 stroke-[2.5]" aria-hidden />
        </button>
      </div>
    </div>
  );
}
