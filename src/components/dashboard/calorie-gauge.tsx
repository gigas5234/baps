"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalorieGaugeProps {
  current: number;
  target: number;
}

function getStatus(percentage: number) {
  if (percentage <= 0) return { message: "오늘의 식단을 기록해보세요!", color: "text-muted-foreground", gaugeColor: "stroke-muted-foreground/30" };
  if (percentage < 80) return { message: "좋아요! 조금 더 드셔도 돼요 🙂", color: "text-emerald-500", gaugeColor: "stroke-emerald-500" };
  if (percentage <= 100) return { message: "완벽한 식단 조절 중! 👏", color: "text-blue-500", gaugeColor: "stroke-blue-500" };
  return { message: "오늘의 목표를 초과했어요! 🔥", color: "text-red-500", gaugeColor: "stroke-red-500" };
}

export function CalorieGauge({ current, target }: CalorieGaugeProps) {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedPct = Math.min(percentage, 100);
  const status = getStatus(percentage);

  // SVG semicircle gauge parameters
  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2 - 10;
  const cx = size / 2;
  const cy = size / 2 + 10;

  // Arc from 180° to 0° (left to right semicircle)
  const startAngle = Math.PI;
  const endAngle = 0;
  const arcLength = Math.PI * radius;

  const bgArc = describeArc(cx, cy, radius, startAngle, endAngle);
  const progressOffset = arcLength - (clampedPct / 100) * arcLength;

  return (
    <div className="bg-card rounded-3xl p-6 shadow-sm border">
      <div className="flex flex-col items-center">
        {/* Gauge SVG */}
        <div className="relative">
          <svg
            width={size}
            height={size / 2 + 20}
            viewBox={`0 0 ${size} ${size / 2 + 30}`}
          >
            {/* Background track */}
            <path
              d={bgArc}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="stroke-muted"
            />
            {/* Animated progress */}
            <motion.path
              d={bgArc}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              className={status.gaugeColor}
              initial={{ strokeDashoffset: arcLength }}
              animate={{ strokeDashoffset: progressOffset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </svg>

          {/* Center content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
            <Flame
              className={cn("w-5 h-5 mb-1", status.color)}
            />
            <motion.p
              className={cn("text-3xl font-bold tabular-nums", status.color)}
              key={current}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {current.toLocaleString()}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-0.5">
              / {target.toLocaleString()} kcal
            </p>
          </div>
        </div>

        {/* Status message */}
        <motion.p
          className={cn("text-sm font-medium mt-3", status.color)}
          key={status.message}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {status.message}
        </motion.p>

        {/* Macro summary bar */}
        {current > 0 && (
          <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">
                {Math.round(percentage)}%
              </p>
              <p>달성률</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">
                {Math.max(target - current, 0).toLocaleString()}
              </p>
              <p>남은 kcal</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Describe a semicircular arc path for SVG */
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
