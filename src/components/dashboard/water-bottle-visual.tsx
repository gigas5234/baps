"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** 물통 실루엣 — clipPath + 스트로크 공통 */
const BOTTLE_PATH =
  "M35,10 h30 v15 h10 q15,0 15,15 v85 q0,15 -15,15 h-50 q-15,0 -15,-15 v-85 q0,-15 15,-15 h10 z";

interface WaterBottleVisualProps {
  /** 0–100, 목표 잔수 대비 충만도(액면 높이) */
  progress: number;
  className?: string;
  /** compact: 작은 카드 · paired: 체중계 카드와 나란히일 때 세로를 크게 */
  size?: "default" | "compact" | "paired";
  /** 병 중앙에 표시할 퍼센트 (예: 권장 ml 대비) */
  centerPercentLabel?: string | null;
}

/**
 * 이미지 없이 SVG clipPath + framer-motion만으로 물이 차오르는 물통.
 */
export function WaterBottleVisual({
  progress,
  className,
  size = "default",
  centerPercentLabel,
}: WaterBottleVisualProps) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `wb-clip-${rawId}`;
  const gradId = `wb-grad-${rawId}`;

  const pct = Math.min(Math.max(progress, 0), 100);
  const fillH = (pct / 100) * 148;
  const surfaceY = 150 - fillH;

  const svgClass =
    size === "paired"
      ? "h-[min(52dvh,14rem)] w-auto max-h-[14rem] min-h-[11rem] max-w-[92%] aspect-[100/150] drop-shadow-md"
      : size === "compact"
        ? "h-[7.25rem] w-[5.5rem] drop-shadow-md sm:h-32 sm:w-[6rem]"
        : "h-[11.5rem] w-[7.25rem] drop-shadow-md sm:h-[12.5rem] sm:w-32";

  return (
    <div
      className={cn("relative flex shrink-0 justify-center", className)}
      aria-hidden={!centerPercentLabel}
      {...(centerPercentLabel
        ? {
            role: "img",
            "aria-label": `물 섭취 진행률 ${centerPercentLabel}`,
          }
        : { "aria-hidden": true })}
    >
      <svg viewBox="0 0 100 150" className={svgClass}>
        <defs>
          <clipPath id={clipId}>
            <path d={BOTTLE_PATH} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop
              offset="0%"
              stopColor="var(--scanner)"
              stopOpacity={0.92}
            />
            <stop
              offset="55%"
              stopColor="var(--scanner)"
              stopOpacity={0.55}
            />
            <stop
              offset="100%"
              stopColor="var(--primary)"
              stopOpacity={0.35}
            />
          </linearGradient>
        </defs>

        <path
          d={BOTTLE_PATH}
          className="fill-muted/80 dark:fill-muted/35"
        />

        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            width="100"
            x="0"
            fill={`url(#${gradId})`}
            initial={false}
            animate={{
              height: fillH,
              y: surfaceY,
            }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
          {pct > 1 ? (
            <motion.g
              initial={false}
              animate={{ y: surfaceY - 5 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            >
              <motion.path
                d="M-30 4 Q 5 -2, 40 4 T 110 4 T 180 4 V 10 L -30 10 Z"
                fill="var(--scanner)"
                fillOpacity={0.42}
                animate={{ x: [-14, 14, -14] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.6,
                  ease: "linear",
                }}
              />
            </motion.g>
          ) : null}
        </g>

        {centerPercentLabel ? (
          <text
            x={50}
            y={96}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white font-data text-[17px] font-bold tabular-nums [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.55))]"
          >
            {centerPercentLabel}
          </text>
        ) : null}

        <path
          d={BOTTLE_PATH}
          fill="none"
          className="stroke-border"
          strokeWidth={2}
        />
        <path
          d={BOTTLE_PATH}
          fill="none"
          stroke="currentColor"
          className="text-foreground/12"
          strokeWidth={1}
          opacity={0.85}
        />
      </svg>
    </div>
  );
}
