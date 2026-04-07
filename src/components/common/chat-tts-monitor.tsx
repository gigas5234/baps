"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
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
  const heightsPx = [10, 14, 8, 13, 11];
  return (
    <div
      className="flex h-4 items-end justify-center gap-px rounded-sm px-0.5"
      aria-hidden
    >
      {heightsPx.map((base, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-[1px] bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.65)] dark:bg-teal-300"
          initial={false}
          animate={
            reduce || !active
              ? { scaleY: 0.22 }
              : {
                  scaleY: [0.35, 1, 0.55, 0.9, 0.4, 1.05, 0.35],
                }
          }
          transition={
            reduce || !active
              ? { duration: 0.2 }
              : {
                  duration: 0.52 + i * 0.05,
                  repeat: Infinity,
                  repeatType: "mirror",
                  ease: "easeInOut",
                  delay: i * 0.04,
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
 * BAPS 소닉 모니터링: 스피커 음소거 / 활성(주파수 목업) 토글.
 * STT(마이크)와 독립 — 실제 TTS 재생은 `enabled`로 이후 분기.
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
        "relative flex max-w-[11.5rem] min-w-0 flex-col gap-1 rounded-xl border px-2.5 py-2 text-left transition-[box-shadow,border-color,background-color] duration-200",
        "touch-manipulation active:scale-[0.98]",
        !enabled &&
          cn(
            "border-slate-600/40 bg-slate-900/[0.28] dark:border-slate-500/28 dark:bg-slate-950/45",
            "bg-[linear-gradient(to_right,rgb(15_23_42/_0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/_0.14)_1px,transparent_1px)] [background-size:7px_7px]",
            "dark:bg-[linear-gradient(to_right,rgb(148_163_184/_0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/_0.09)_1px,transparent_1px)]"
          ),
        enabled &&
          cn(
            "border-teal-400/45 bg-teal-950/15 shadow-[0_0_16px_rgba(20,184,166,0.38)] dark:border-teal-400/35 dark:bg-teal-950/25",
            "dark:shadow-[0_0_20px_rgba(94,234,212,0.32)]"
          )
      )}
    >
      <div className="flex items-center gap-1.5">
        {!enabled ? (
          <>
            <AlertTriangle
              className="h-3.5 w-3.5 shrink-0 text-amber-400"
              strokeWidth={2.2}
              aria-hidden
            />
            <VolumeX
              className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400"
              strokeWidth={2}
              aria-hidden
            />
            {/* 음소거: 스피커 옆 일직선 */}
            <span
              className="h-0.5 w-5 shrink-0 rounded-full bg-slate-500/90 dark:bg-slate-400/85"
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
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-[10px] font-bold leading-none tracking-tight",
          !enabled &&
            "text-amber-400 [text-shadow:0_0_12px_rgba(251,191,36,0.45)] dark:text-amber-300 dark:[text-shadow:0_0_14px_rgba(251,191,36,0.35)]",
          enabled &&
            "text-teal-600 [text-shadow:0_0_12px_rgba(13,148,136,0.45)] dark:text-teal-300 dark:[text-shadow:0_0_14px_rgba(45,212,191,0.35)]"
        )}
      >
        {!enabled ? (
          <>
            <span aria-hidden>🔇</span>
            <span>소리 끔</span>
            <span className="ml-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-500/80 dark:text-amber-400/75">
              silent
            </span>
          </>
        ) : (
          <>
            <span aria-hidden>🎙️</span>
            <span className="font-mono">보이스 ON</span>
            <span
              className="ml-0.5 text-[10px] font-mono text-teal-700/90 dark:text-teal-200/90"
              aria-hidden
            >
              :-]
            </span>
          </>
        )}
      </div>
    </button>
  );
}
