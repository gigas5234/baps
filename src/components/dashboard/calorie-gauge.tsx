"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCalorieZone, type CalorieZone } from "@/lib/calorie-zone";
import type { MacroTotals } from "@/lib/meal-macros";
import { MacroTargetMicroBars } from "@/components/dashboard/macro-target-micro-bars";
import {
  buildDashboardNextAction,
  buildLiveSignalLine,
} from "@/lib/dashboard-coach";

interface CalorieGaugeProps {
  current: number;
  target: number;
  macros?: MacroTotals | null;
  /** 상단 히어로용 축소 레이아웃 (배지·코칭·탄단지 스트립 생략) */
  compact?: boolean;
  mealCount?: number;
}

function statusBadge(zone: CalorieZone): {
  label: string;
  emoji: string;
  className: string;
} {
  switch (zone) {
    case "empty":
      return {
        label: "STANDBY",
        emoji: "⚪",
        className:
          "border-muted-foreground/35 bg-background/70 text-muted-foreground",
      };
    case "safe":
      return {
        label: "SAFE",
        emoji: "🟢",
        className:
          "border-gauge-safe/40 bg-gauge-safe/10 text-gauge-safe dark:border-gauge-safe/35 dark:bg-gauge-safe/12",
      };
    case "caution":
      return {
        label: "CAUTION",
        emoji: "🟡",
        className:
          "border-gauge-caution/45 bg-gauge-caution/10 text-gauge-caution dark:border-gauge-caution/40 dark:bg-gauge-caution/12",
      };
    case "danger":
      return {
        label: "OVER-LIMIT",
        emoji: "🔴",
        className:
          "border-gauge-danger/50 bg-gauge-danger/12 text-gauge-danger dark:border-gauge-danger/45 dark:bg-gauge-danger/14",
      };
  }
}

function zoneStyle(zone: CalorieZone): {
  message: string;
  textClass: string;
  accent: string;
  trackStroke: string;
  cardBg: string;
  cardRing: string;
  glassGradient: string;
} {
  switch (zone) {
    case "empty":
      return {
        message: "오늘의 식단을 기록해보세요!",
        textClass: "text-muted-foreground",
        accent: "color-mix(in srgb, var(--muted-foreground) 90%, transparent)",
        trackStroke: "color-mix(in srgb, var(--border) 60%, transparent)",
        cardBg:
          "color-mix(in srgb, var(--card) 90%, var(--muted) 10%)",
        cardRing: "color-mix(in srgb, var(--border) 38%, transparent)",
        glassGradient:
          "linear-gradient(145deg, color-mix(in srgb, var(--card) 96%, transparent) 0%, color-mix(in srgb, var(--muted) 14%, var(--card)) 100%)",
      };
    case "safe":
      return {
        message: "좋아요! 여유 있어요 🙂",
        textClass: "text-gauge-safe",
        accent: "var(--gauge-safe)",
        trackStroke: "color-mix(in srgb, var(--gauge-safe) 38%, transparent)",
        cardBg:
          "color-mix(in srgb, var(--gauge-safe) 12%, var(--card))",
        cardRing:
          "color-mix(in srgb, var(--gauge-safe) 28%, transparent)",
        glassGradient:
          "linear-gradient(145deg, color-mix(in srgb, var(--gauge-safe) 16%, var(--card)) 0%, color-mix(in srgb, var(--gauge-safe) 10%, transparent) 55%, var(--card) 100%)",
      };
    case "caution":
      return {
        message: "목표에 거의 도달했어요. 조금만 조절해요 👀",
        textClass: "text-gauge-caution",
        accent: "var(--gauge-caution)",
        trackStroke:
          "color-mix(in srgb, var(--gauge-caution) 42%, transparent)",
        cardBg:
          "color-mix(in srgb, var(--gauge-caution) 11%, var(--card))",
        cardRing:
          "color-mix(in srgb, var(--gauge-caution) 30%, transparent)",
        glassGradient:
          "linear-gradient(145deg, color-mix(in srgb, var(--gauge-caution) 18%, var(--card)) 0%, color-mix(in srgb, var(--gauge-caution) 12%, transparent) 50%, var(--card) 100%)",
      };
    case "danger":
      return {
        message: "목표를 넘겼어요! 내일은 가볍게 가볼까요 🔥",
        textClass: "text-gauge-danger",
        accent: "var(--gauge-danger)",
        trackStroke:
          "color-mix(in srgb, var(--gauge-danger) 45%, transparent)",
        cardBg:
          "color-mix(in srgb, var(--gauge-danger) 11%, var(--card))",
        cardRing:
          "color-mix(in srgb, var(--gauge-danger) 32%, transparent)",
        glassGradient:
          "linear-gradient(145deg, color-mix(in srgb, var(--gauge-danger) 20%, var(--card)) 0%, color-mix(in srgb, var(--gauge-danger) 14%, transparent) 48%, var(--card) 100%)",
      };
  }
}

export function CalorieGauge({
  current,
  target,
  macros = null,
  compact = false,
  mealCount = 0,
}: CalorieGaugeProps) {
  const gradId = `gg${useId().replace(/:/g, "")}`;
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedPct = Math.min(percentage, 100);
  const zone = getCalorieZone(current, target);
  const style = zoneStyle(zone);
  const badge = statusBadge(zone);
  const isDanger = zone === "danger";
  const isEmpty = zone === "empty";

  const size = compact ? 168 : 220;
  const strokeWidth = compact ? 11 : 14;
  const radius = (size - strokeWidth) / 2 - (compact ? 8 : 10);
  const cx = size / 2;
  const cy = size / 2 + (compact ? 7 : 10);

  const startAngle = Math.PI;
  const endAngle = 0;
  const arcLength = Math.PI * radius;

  const bgArc = describeArc(cx, cy, radius, startAngle, endAngle);
  const progressOffset = arcLength - (clampedPct / 100) * arcLength;

  const macroTotals: MacroTotals = macros ?? {
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
  };

  const nextAction = buildDashboardNextAction(
    zone,
    current,
    target,
    macros
  );
  const liveSignal = buildLiveSignalLine(
    zone,
    current,
    mealCount,
    macros
  );

  const macroStrip =
    !compact && target > 0 ? (
      <MacroTargetMicroBars current={macroTotals} targetKcal={target} />
    ) : null;

  return (
    <motion.div
      className={cn(
        "rounded-3xl border shadow-lg transition-[background-color,box-shadow,backdrop-filter] duration-500",
        "backdrop-blur-xl dark:shadow-black/20",
        compact ? "rounded-2xl p-4" : "p-6",
        isDanger && "animate-gauge-wobble"
      )}
      style={{
        background: `${style.glassGradient}, ${style.cardBg}`,
        backgroundBlendMode: "normal",
        borderColor: style.cardRing,
        boxShadow: isEmpty
          ? `0 4px 24px -4px ${style.cardRing}`
          : `0 4px 24px -4px ${style.cardRing}, 0 1px 0 0 rgba(255,255,255,0.5) inset`,
      }}
    >
      <div className="flex flex-col items-center">
        {!compact ? (
          <div className="mb-1 flex w-full justify-center">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-data text-[11px] font-bold tracking-widest",
                badge.className
              )}
            >
              <span aria-hidden>{badge.emoji}</span>
              {badge.label}
            </span>
          </div>
        ) : null}

        <div className="relative">
          <svg
            width={size}
            height={size / 2 + (compact ? 16 : 20)}
            viewBox={`0 0 ${size} ${size / 2 + (compact ? 24 : 30)}`}
          >
            <defs>
              <linearGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="var(--gauge-safe)" />
                <stop offset="52%" stopColor="var(--gauge-caution)" />
                <stop offset="100%" stopColor="var(--gauge-danger)" />
              </linearGradient>
            </defs>
            <path
              d={bgArc}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{ stroke: style.trackStroke }}
            />
            <motion.path
              d={bgArc}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              stroke={`url(#${gradId})`}
              initial={{ strokeDashoffset: arcLength }}
              animate={{ strokeDashoffset: progressOffset }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              style={{
                opacity: zone === "empty" ? 0.35 : 1,
              }}
            />
          </svg>

          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-end",
              compact ? "pb-1" : "pb-2"
            )}
          >
            <Flame
              className={cn(
                "mb-0.5",
                compact ? "h-4 w-4" : "mb-1 h-5 w-5",
                isEmpty &&
                  "text-foreground/70 dark:text-foreground/85"
              )}
              style={!isEmpty ? { color: style.accent } : undefined}
              strokeWidth={2}
            />
            <motion.p
              className={cn(
                "font-data font-bold tabular-nums",
                compact ? "text-2xl" : "text-4xl",
                isEmpty
                  ? "text-foreground/80 dark:text-foreground/90"
                  : style.textClass
              )}
              key={current}
              initial={{ scale: 1.08, opacity: 0.85 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28 }}
            >
              {current.toLocaleString()}
            </motion.p>
            <p
              className={cn(
                compact ? "mt-0 text-[11px]" : "mt-0.5 text-xs",
                isEmpty
                  ? "text-foreground/65 dark:text-foreground/75"
                  : "text-muted-foreground"
              )}
            >
              / {target.toLocaleString()} kcal
            </p>
            {compact && current > 0 ? (
              <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                달성 {Math.round(percentage)}% · 남은{" "}
                {Math.max(target - current, 0).toLocaleString()}kcal
              </p>
            ) : null}
          </div>
        </div>

        {!compact ? (
          <motion.p
            className={cn(
              "mt-2 text-center text-xs font-medium text-muted-foreground",
              isEmpty
                ? "text-foreground/80 dark:text-foreground/88"
                : "text-muted-foreground"
            )}
            key={style.message}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
          >
            {style.message}
          </motion.p>
        ) : null}

        {!compact && current > 0 ? (
          <div className="mt-3 flex gap-6 text-xs text-muted-foreground">
            <div className="text-center">
              <p
                className="font-data text-base font-bold tabular-nums text-foreground"
                style={{ color: zone === "empty" ? undefined : style.accent }}
              >
                {Math.round(percentage)}%
              </p>
              <p className="text-[10px]">달성률</p>
            </div>
            <div className="w-px bg-border/80" />
            <div className="text-center">
              <p className="font-data text-base font-bold tabular-nums text-foreground">
                {Math.max(target - current, 0).toLocaleString()}
              </p>
              <p className="text-[10px]">남은 kcal</p>
            </div>
          </div>
        ) : null}

        {macroStrip}

        {!compact ? (
          <>
            <p className="mt-4 w-full text-center text-[11px] font-medium leading-snug text-foreground">
              {nextAction}
            </p>
            <p className="mt-2 w-full text-center text-[10px] leading-relaxed text-muted-foreground">
              {liveSignal}
            </p>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy - radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy - radius * Math.sin(endAngle);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}
