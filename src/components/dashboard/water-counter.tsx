"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WaterBottleVisual } from "@/components/dashboard/water-bottle-visual";

function waterCoachCopy(opts: {
  pctTowardRecommended: number;
  cups: number;
}): string {
  const { pctTowardRecommended, cups } = opts;
  if (cups === 0 || pctTowardRecommended < 42) {
    return "수분이 부족하면 신진대사가 느려집니다. 마시십시오.";
  }
  if (pctTowardRecommended < 78) {
    return "흐름이 안정적입니다. 권장량까지 한 잔씩 밀어 넣으십시오.";
  }
  if (pctTowardRecommended < 100) {
    return "거의 도달했습니다. 가짜 갈증을 경계하고 마무리만 정확히.";
  }
  return "목표를 넘겼습니다. 내일 분석 신뢰도를 위해 과다는 피하십시오.";
}

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
  const fillProgress = Math.min((cups / safeTarget) * 100, 100);
  const totalMl = cups * cupMl;
  const goalMl = safeTarget * cupMl;
  const pctTowardRecommended =
    recommendedMl > 0
      ? Math.min(999, Math.round((totalMl / recommendedMl) * 100))
      : Math.round((cups / safeTarget) * 100);
  const centerLabel = `${pctTowardRecommended}%`;
  const canDecrement = !readOnly && cups > 0 && !isUpdating;
  const canIncrement = !readOnly && !isUpdating;

  if (paired) {
    return (
      <div
        className={cn(
          "flex min-h-[22rem] flex-col rounded-2xl border border-border/80 bg-card/80 p-2.5 shadow-sm",
          "dark:border-white/10 dark:bg-card/40"
        )}
      >
        <p className="text-center text-xs font-semibold leading-tight text-foreground">
          물 섭취
        </p>
        <p className="text-[10px] text-center text-muted-foreground tabular-nums">
          {safeTarget}잔 · {goalMl.toLocaleString()}ml
        </p>
        <div className="mt-1 flex flex-1 flex-col items-center justify-between gap-2">
          <WaterBottleVisual
            progress={fillProgress}
            size="compact"
            centerPercentLabel={centerLabel}
            className="shrink-0 opacity-95"
          />
          <div className="flex w-full max-w-[11.5rem] items-center justify-between gap-1">
            <button
              type="button"
              onClick={onDecrement}
              disabled={!canDecrement}
              aria-label="1잔 빼기"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-transform active:scale-95",
                "disabled:pointer-events-none disabled:opacity-35",
                "hover:bg-muted/80 dark:bg-card dark:hover:bg-muted/50"
              )}
            >
              <Minus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            </button>
            <motion.span
              key={cups}
              className="font-data text-lg font-semibold tabular-nums text-foreground"
              initial={{ scale: 1.03, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
            >
              {cups}
              <span className="text-xs font-medium text-muted-foreground">
                /{safeTarget}
              </span>
            </motion.span>
            <button
              type="button"
              onClick={onIncrement}
              disabled={!canIncrement}
              aria-label="1잔 더하기"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-teal-700/30 bg-teal-700/88 text-white transition-transform active:scale-95",
                "disabled:pointer-events-none disabled:opacity-50",
                "hover:bg-teal-700 dark:border-teal-500/25 dark:bg-teal-800/90"
              )}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            </button>
          </div>
          <p className="text-[9px] leading-tight text-muted-foreground">
            {totalMl}ml · 권장 {recommendedMl.toLocaleString()}ml
          </p>
          {readOnly ? (
            <p className="text-[9px] text-muted-foreground">로그인 후 기록</p>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-2 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2",
            "dark:border-white/10 dark:bg-muted/15"
          )}
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
            관제 코멘트
          </p>
          <p className="mt-1 text-[10px] font-medium leading-relaxed text-foreground/90">
            {waterCoachCopy({ pctTowardRecommended, cups })}
          </p>
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
          progress={fillProgress}
          centerPercentLabel={centerLabel}
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
            {centerLabel ? (
              <span className="font-data font-semibold text-foreground/80">
                {" "}
                · 병 기준 {centerLabel}
              </span>
            ) : null}
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
