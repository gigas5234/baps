"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** 물통 실루엣 — clipPath + 스트로크 공통 */
const BOTTLE_PATH =
  "M35,10 h30 v15 h10 q15,0 15,15 v85 q0,15 -15,15 h-50 q-15,0 -15,-15 v-85 q0,-15 15,-15 h10 z";

interface WaterBottleVisualProps {
  /** 0–100, 목표 대비 충만도 */
  progress: number;
  className?: string;
}

/**
 * 이미지 없이 SVG clipPath + framer-motion만으로 물이 차오르는 물통.
 * clipPath를 쿠키 틀처럼 쓰고, rect 높이만 조절합니다.
 */
export function WaterBottleVisual({
  progress,
  className,
}: WaterBottleVisualProps) {
  const rawId = useId().replace(/:/g, "");
  const clipId = `wb-clip-${rawId}`;
  const gradId = `wb-grad-${rawId}`;

  const pct = Math.min(Math.max(progress, 0), 100);
  const fillH = (pct / 100) * 148;
  const surfaceY = 150 - fillH;

  return (
    <div
      className={cn("relative flex shrink-0 justify-center", className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 150"
        className="h-[11.5rem] w-[7.25rem] drop-shadow-md sm:h-[12.5rem] sm:w-32"
      >
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

        {/* 빈 통 */}
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

        {/* 테두리 */}
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
