"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WaterBottleVisual } from "@/components/dashboard/water-bottle-visual";

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
  /** 비로그인 등: 버튼 비활성 + 안내 */
  readOnly?: boolean;
  /** 체중 카드와 한 줄에 넣을 때 세로 공간 축소 */
  variant?: "default" | "paired";
}

export function WaterCounter({
  cups,
  cupMl = 250,
  targetCups,
  recommendedMl,
  onIncrement,
  onDecrement,
  isUpdating,
  readOnly = false,
  variant = "default",
}: WaterCounterProps) {
  const paired = variant === "paired";
  const safeTarget = Math.max(1, targetCups);
  const percentage = Math.min((cups / safeTarget) * 100, 100);
  const totalMl = cups * cupMl;
  const goalMl = safeTarget * cupMl;
  const canDecrement = !readOnly && cups > 0 && !isUpdating;
  const canIncrement = !readOnly && !isUpdating;

  if (paired) {
    return (
      <div
        className={cn(
          "flex h-full min-h-0 flex-col rounded-2xl border border-white/25 p-2.5 shadow-md",
          "bg-card/65 backdrop-blur-xl dark:border-white/10 dark:bg-card/40"
        )}
      >
        <p className="text-center text-xs font-semibold leading-tight">
          물 섭취
        </p>
        <p className="text-[10px] text-center text-muted-foreground tabular-nums dark:text-foreground/65">
          {safeTarget}잔 · {goalMl.toLocaleString()}ml
        </p>
        <div className="mt-1.5 flex flex-1 flex-col items-center justify-center gap-1.5">
          <WaterBottleVisual
            progress={percentage}
            className="w-[4.75rem] shrink-0"
          />
          <div className="flex w-full max-w-[11rem] items-center justify-between gap-1">
            <button
              type="button"
              onClick={onDecrement}
              disabled={!canDecrement}
              aria-label="1잔 빼기"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-background text-foreground shadow-sm transition-transform active:scale-95",
                "disabled:pointer-events-none disabled:opacity-35",
                "hover:bg-muted/80"
              )}
            >
              <Minus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            </button>
            <motion.span
              key={cups}
              className="font-data text-lg font-bold tabular-nums text-scanner"
              initial={{ scale: 1.05, opacity: 0.85 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              {cups}
              <span className="text-xs font-semibold text-muted-foreground dark:text-foreground/55">
                /{safeTarget}
              </span>
            </motion.span>
            <button
              type="button"
              onClick={onIncrement}
              disabled={!canIncrement}
              aria-label="1잔 더하기"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-scanner text-scanner-foreground shadow-md shadow-scanner/25 transition-transform active:scale-95",
                "disabled:pointer-events-none disabled:opacity-50",
                "hover:brightness-95 dark:hover:brightness-110"
              )}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            </button>
          </div>
          <p className="text-[9px] leading-tight text-muted-foreground dark:text-foreground/60">
            {totalMl}ml · 권장 {recommendedMl.toLocaleString()}ml
          </p>
          {readOnly ? (
            <p className="text-[9px] text-muted-foreground">로그인 후 기록</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/25 p-4 shadow-md",
        "bg-card/65 backdrop-blur-xl dark:border-white/10 dark:bg-card/40"
      )}
    >
      <div className="flex items-center gap-4 sm:gap-5">
        <WaterBottleVisual
          progress={percentage}
          className="w-[7.25rem] sm:w-32"
        />

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">물 섭취</p>
            <p className="text-xs text-muted-foreground dark:text-foreground/70">
              목표 <span className="font-data font-medium">{safeTarget}</span>
              잔 ·{" "}
              <span className="font-data">{goalMl.toLocaleString()}</span>
              ml
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
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
              <Minus className="h-5 w-5 stroke-[2.5]" aria-hidden />
            </button>

            <div className="flex min-w-0 flex-1 flex-col items-center px-1 text-center">
              <motion.span
                key={cups}
                className="font-data text-3xl font-bold tabular-nums tracking-tight text-scanner"
                initial={{ scale: 1.06, opacity: 0.85 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                {cups}
                <span className="text-lg font-semibold text-muted-foreground dark:text-foreground/55">
                  {" "}
                  / {safeTarget}
                </span>
              </motion.span>
              <span className="text-[11px] text-muted-foreground dark:text-foreground/65">
                1잔 {cupMl}ml · 누적 {totalMl}ml
              </span>
            </div>

            <button
              type="button"
              onClick={onIncrement}
              disabled={!canIncrement}
              aria-label="1잔 더하기"
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-scanner text-scanner-foreground shadow-md shadow-scanner/25 transition-transform active:scale-95",
                "disabled:opacity-50 disabled:pointer-events-none",
                "hover:brightness-95 dark:hover:brightness-110"
              )}
            >
              <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden />
            </button>
          </div>

          <p className="text-[10px] leading-snug text-muted-foreground dark:text-foreground/60">
            권장 약 {recommendedMl.toLocaleString()}ml
            <span className="hidden sm:inline">
              {" "}
              (체중·BMR·목표 칼로리 반영)
            </span>
          </p>

          {readOnly ? (
            <p className="text-[11px] leading-snug text-muted-foreground dark:text-foreground/70">
              로그인 후 물 섭취를 기록할 수 있어요.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
