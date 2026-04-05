"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { WaterBottleVisual } from "@/components/dashboard/water-bottle-visual";

const WATER_100_STORAGE_PREFIX = "baps-water-100-done:";

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
  /**
   * 권장량 100% 달성 축하(날짜당 1회). 물 기록과 같은 캘린더 날짜 키를 넘기세요.
   */
  celebrationDateKey?: string;
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
  celebrationDateKey = "",
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

  const prevPctRef = useRef<number | null>(null);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    prevPctRef.current = null;
  }, [celebrationDateKey]);

  useEffect(() => {
    if (!paired || readOnly || !celebrationDateKey) return;
    const storageKey = `${WATER_100_STORAGE_PREFIX}${celebrationDateKey}`;
    const already =
      typeof window !== "undefined" && localStorage.getItem(storageKey) === "1";
    const prev = prevPctRef.current;
    prevPctRef.current = pctTowardRecommended;
    if (already || pctTowardRecommended < 100) return;
    const crossed = prev !== null && prev < 100;
    if (!crossed) return;
    localStorage.setItem(storageKey, "1");
    setCelebrate(true);
    const t = window.setTimeout(() => setCelebrate(false), 3200);
    return () => window.clearTimeout(t);
  }, [paired, readOnly, celebrationDateKey, pctTowardRecommended]);

  if (paired) {
    return (
      <div
        className={cn(
          "relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-2.5 shadow-sm",
          "dark:border-white/10 dark:bg-card/40"
        )}
      >
        <div className="flex items-start gap-1.5 px-0.5 pb-1.5">
          <Droplets
            className="h-4 w-4 shrink-0 text-primary"
            strokeWidth={2}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight tracking-tight text-foreground">
              물 섭취
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {safeTarget}잔 · {goalMl.toLocaleString()}ml
            </p>
          </div>
        </div>
        <div className="mt-0.5 flex min-h-0 flex-1 flex-col items-stretch justify-between gap-2 px-0.5">
          <div className="flex min-h-[11rem] flex-1 flex-col items-center justify-center">
            <WaterBottleVisual
              progress={fillProgress}
              size="paired"
              centerPercentLabel={centerLabel}
              className="w-full max-w-[11rem] opacity-95"
            />
          </div>
          <div className="flex w-full max-w-[13rem] items-center justify-between gap-1 self-center">
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
          <p className="text-[11px] leading-snug text-muted-foreground">
            {totalMl}ml · 권장 {recommendedMl.toLocaleString()}ml
          </p>
          {readOnly ? (
            <p className="text-[11px] text-muted-foreground">로그인 후 기록</p>
          ) : null}
        </div>

        <AnimatePresence>
          {celebrate ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/55 px-3 backdrop-blur-[2px] dark:bg-zinc-950/50"
            >
              <motion.div
                initial={{ scale: 0.88, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="relative max-w-[14rem] rounded-2xl border border-teal-500/35 bg-teal-700 px-4 py-3 text-center text-white shadow-xl shadow-teal-900/30 dark:bg-teal-800"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-100/90">
                  권장량 달성
                </p>
                <p className="mt-1 text-sm font-bold leading-snug">
                  오늘 물 섭취 완료!
                </p>
                <p className="mt-1.5 text-[10px] font-medium text-teal-100/85">
                  잠깐만 축하할게요 — 내일도 정직하게 기록합시다.
                </p>
              </motion.div>
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {[...Array(14)].map((_, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-lg"
                    initial={{
                      opacity: 0.85,
                      x: `${35 + (i % 5) * 12}%`,
                      y: "72%",
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 0,
                      y: `${8 + (i % 3) * 6}%`,
                      x: `${30 + (i % 7) * 8}%`,
                      scale: 1.25,
                      rotate: i % 2 === 0 ? 12 : -10,
                    }}
                    transition={{ duration: 1.8 + (i % 4) * 0.12, ease: "easeOut" }}
                  >
                    {i % 3 === 0 ? "✨" : i % 3 === 1 ? "·" : "★"}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
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
