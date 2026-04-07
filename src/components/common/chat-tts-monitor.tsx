"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatTtsMonitorToggleProps = {
  /** 소리 재생 허용 (코치 TTS 연동 시 이 값으로 분기) */
  enabled: boolean;
  onToggle: () => void;
  /** 코치가 응답 생성·스트림 중일 때만 막대 애니메이션 */
  coachActive: boolean;
};

function SonicEqBars({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  /** 실시간 주파수 느낌 — 막대마다 다른 키프레임 시퀀스 */
  const heightsPx = [9, 14, 7, 16, 10, 12, 8];
  const rhythms: number[][] = [
    [0.32, 0.95, 0.48, 1, 0.58, 0.82, 0.36],
    [0.5, 0.68, 0.9, 0.42, 1, 0.4, 0.72],
    [0.72, 0.38, 0.88, 0.62, 0.5, 1, 0.55],
    [0.38, 0.85, 0.55, 0.92, 0.68, 0.45, 0.88],
  ];
  return (
    <div
      className="flex h-4 items-end justify-center gap-px rounded-sm px-0.5"
      aria-hidden
    >
      {heightsPx.map((base, i) => (
        <motion.span
          key={i}
          className="w-[2.5px] rounded-[1px] bg-gradient-to-t from-teal-600/90 via-teal-400 to-teal-200 shadow-[0_0_7px_rgba(45,212,191,0.7)] dark:from-teal-500 dark:via-teal-300 dark:to-teal-100"
          initial={false}
          animate={
            reduce || !active
              ? { scaleY: 0.2 }
              : {
                  scaleY: [
                    rhythms[0][i]!,
                    rhythms[1][i]!,
                    rhythms[2][i]!,
                    rhythms[3][i]!,
                    rhythms[0][i]!,
                  ],
                }
          }
          transition={
            reduce || !active
              ? { duration: 0.2 }
              : {
                  duration: 1.05 + i * 0.045,
                  repeat: Infinity,
                  ease: [0.45, 0, 0.55, 1],
                  delay: i * 0.06,
                }
          }
          style={{
            height: `${base}px`,
            transformOrigin: "50% 100%",
          }}
        />
      ))}
    </div>
  );
}

/**
 * BAPS 소닉 모니터: 무음 — 무채색 스피커 + 일직선 / ON — 민트 스피커 + EQ 파형만.
 */
export function ChatTtsMonitorToggle({
  enabled,
  onToggle,
  coachActive,
}: ChatTtsMonitorToggleProps) {
  const barsActive = enabled && coachActive;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "코치 음성 끄기" : "코치 음성 켜기"}
      className={cn(
        "relative flex items-center gap-1.5 overflow-hidden rounded-xl px-2 py-1.5",
        "transition-[box-shadow,border-color,backdrop-filter] duration-300 ease-out",
        "touch-manipulation active:scale-[0.98]",
        !enabled &&
          cn(
            "border border-slate-500/25 bg-slate-900/32 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]",
            "backdrop-blur-xl dark:border-white/[0.07] dark:bg-slate-950/45",
            "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          ),
        enabled &&
          cn(
            "border border-teal-400/40 bg-gradient-to-br from-teal-400/[0.14] via-teal-950/18 to-slate-950/35",
            "shadow-[0_0_22px_rgba(20,184,166,0.34),inset_0_1px_0_rgba(255,255,255,0.12)]",
            "backdrop-blur-xl dark:from-teal-400/12 dark:via-teal-950/22 dark:to-slate-950/40",
            "dark:border-teal-400/35 dark:shadow-[0_0_26px_rgba(94,234,212,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
          )
      )}
    >
      {!enabled ? (
        <>
          <VolumeX
            className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
            strokeWidth={2}
            aria-hidden
          />
          <span
            className="h-0.5 w-4 shrink-0 rounded-full bg-slate-500/90 dark:bg-slate-400/85"
            aria-hidden
          />
        </>
      ) : (
        <>
          <Volume2
            className="h-4 w-4 shrink-0 text-teal-500 drop-shadow-[0_0_8px_rgba(20,184,166,0.55)] dark:text-teal-300"
            strokeWidth={2}
            aria-hidden
          />
          <SonicEqBars active={barsActive} />
        </>
      )}
    </button>
  );
}
