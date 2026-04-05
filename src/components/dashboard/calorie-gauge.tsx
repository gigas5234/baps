"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCalorieZone } from "@/lib/calorie-zone";
import type { MacroTotals } from "@/lib/meal-macros";
import { MacroMiniBars } from "@/components/dashboard/macro-mini-bars";

interface CalorieGaugeProps {
  current: number;
  target: number;
  macros?: MacroTotals | null;
}

const SAFE = "#4ADE80";
const CAUTION = "#FB923C";
const DANGER = "#F87171";

function zoneStyle(zone: ReturnType<typeof getCalorieZone>): {
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
        accent: "rgb(163 163 163)",
        trackStroke: "rgb(212 212 212 / 0.55)",
        cardBg: "rgba(245, 245, 245, 0.55)",
        cardRing: "rgba(0,0,0,0.06)",
        glassGradient:
          "linear-gradient(145deg, rgba(255,255,255,0.65) 0%, rgba(250,250,250,0.4) 45%, rgba(245,245,245,0.35) 100%)",
      };
    case "safe":
      return {
        message: "좋아요! 여유 있어요 🙂",
        textClass: "text-[#16A34A]",
        accent: SAFE,
        trackStroke: "rgb(74 222 128 / 0.35)",
        cardBg: "rgba(74, 222, 128, 0.08)",
        cardRing: "rgba(74, 222, 128, 0.22)",
        glassGradient:
          "linear-gradient(145deg, rgba(240,253,244,0.7) 0%, rgba(74,222,128,0.12) 55%, rgba(255,255,255,0.35) 100%)",
      };
    case "caution":
      return {
        message: "목표에 거의 도달했어요. 조금만 조절해요 👀",
        textClass: "text-[#EA580C]",
        accent: CAUTION,
        trackStroke: "rgb(251 146 60 / 0.4)",
        cardBg: "rgba(251, 146, 60, 0.09)",
        cardRing: "rgba(251, 146, 60, 0.25)",
        glassGradient:
          "linear-gradient(145deg, rgba(255,247,237,0.75) 0%, rgba(251,146,60,0.14) 50%, rgba(255,255,255,0.3) 100%)",
      };
    case "danger":
      return {
        message: "목표를 넘겼어요! 내일은 가볍게 가볼까요 🔥",
        textClass: "text-[#DC2626]",
        accent: DANGER,
        trackStroke: "rgb(248 113 113 / 0.45)",
        cardBg: "rgba(248, 113, 113, 0.09)",
        cardRing: "rgba(248, 113, 113, 0.3)",
        glassGradient:
          "linear-gradient(145deg, rgba(254,242,242,0.8) 0%, rgba(248,113,113,0.16) 48%, rgba(255,255,255,0.28) 100%)",
      };
  }
}

export function CalorieGauge({
  current,
  target,
  macros = null,
}: CalorieGaugeProps) {
  const gradId = `gg${useId().replace(/:/g, "")}`;
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedPct = Math.min(percentage, 100);
  const zone = getCalorieZone(current, target);
  const style = zoneStyle(zone);
  const isDanger = zone === "danger";

  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 10;

  const startAngle = Math.PI;
  const endAngle = 0;
  const arcLength = Math.PI * radius;

  const bgArc = describeArc(cx, cy, radius, startAngle, endAngle);
  const progressOffset = arcLength - (clampedPct / 100) * arcLength;

  const macroBlock =
    macros != null ? (
      <MacroMiniBars macros={macros} totalMealCalories={current} />
    ) : null;

  return (
    <motion.div
      className={cn(
        "rounded-3xl border p-6 shadow-lg transition-[background-color,box-shadow,backdrop-filter] duration-500",
        "backdrop-blur-xl dark:shadow-black/20",
        isDanger && "animate-gauge-wobble"
      )}
      style={{
        background: `${style.glassGradient}, ${style.cardBg}`,
        backgroundBlendMode: "normal",
        borderColor: style.cardRing,
        boxShadow: `0 4px 24px -4px ${style.cardRing}, 0 1px 0 0 rgba(255,255,255,0.5) inset`,
      }}
    >
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            width={size}
            height={size / 2 + 20}
            viewBox={`0 0 ${size} ${size / 2 + 30}`}
          >
            <defs>
              <linearGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#4ADE80" />
                <stop offset="52%" stopColor="#FB923C" />
                <stop offset="100%" stopColor="#F87171" />
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

          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <Flame
              className={cn(
                "mb-1 h-5 w-5",
                zone === "empty" && "text-muted-foreground"
              )}
              style={zone === "empty" ? undefined : { color: style.accent }}
              strokeWidth={2}
            />
            <motion.p
              className={cn(
                "text-3xl font-bold tabular-nums",
                zone === "empty" ? "text-muted-foreground" : style.textClass
              )}
              key={current}
              initial={{ scale: 1.08, opacity: 0.85 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.28 }}
            >
              {current.toLocaleString()}
            </motion.p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              / {target.toLocaleString()} kcal
            </p>
          </div>
        </div>

        <motion.p
          className={cn("mt-3 text-sm font-medium", style.textClass)}
          key={style.message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          {style.message}
        </motion.p>

        {current > 0 && (
          <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
            <div className="text-center">
              <p
                className="text-sm font-semibold tabular-nums"
                style={{ color: zone === "empty" ? undefined : style.accent }}
              >
                {Math.round(percentage)}%
              </p>
              <p>달성률</p>
            </div>
            <div className="w-px bg-border/80" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">
                {Math.max(target - current, 0).toLocaleString()}
              </p>
              <p>남은 kcal</p>
            </div>
          </div>
        )}

        {macroBlock}
      </div>
    </motion.div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}
