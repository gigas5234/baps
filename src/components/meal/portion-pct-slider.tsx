"use client";

import { useCallback, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

export const PORTION_STEPS = [0, 25, 50, 75, 100] as const;
export type PortionStep = (typeof PORTION_STEPS)[number];

function snapToStep(raw: number, steps: readonly number[]): number {
  const p = Math.max(0, Math.min(100, raw));
  let best = steps[0] ?? 0;
  let bestDist = Infinity;
  for (const s of steps) {
    const d = Math.abs(s - p);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function labelStyle(step: number): CSSProperties {
  if (step === 0) return { left: "0%", transform: "translateX(0)" };
  if (step === 100)
    return { left: "100%", transform: "translateX(-100%)" };
  return { left: `${step}%`, transform: "translateX(-50%)" };
}

interface PortionPctSliderProps {
  value: PortionStep;
  onChange: (pct: PortionStep) => void;
  className?: string;
  steps?: readonly number[];
}

/**
 * 25% 단위 스냅 · 트랙/썸 드래그 + 눈금 라벨 탭
 */
export function PortionPctSlider({
  value,
  onChange,
  className,
  steps = PORTION_STEPS,
}: PortionPctSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = r.width;
      const x = clientX - r.left;
      const ratio = w > 0 ? Math.max(0, Math.min(1, x / w)) : 0;
      const next = snapToStep(ratio * 100, steps) as PortionStep;
      onChange(next);
    },
    [onChange, steps]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromClientX(e.clientX);
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      className={cn(
        "touch-none select-none px-1",
        className
      )}
    >
      <div
        ref={trackRef}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%`}
        aria-label="섭취 비율"
        tabIndex={0}
        className={cn(
          "relative mt-1 h-11 cursor-grab py-1 active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scanner/50 focus-visible:ring-offset-2 rounded-full"
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={(e) => {
          const idx = steps.indexOf(value as number);
          if (idx < 0) return;
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const n = steps[Math.min(idx + 1, steps.length - 1)];
            onChange(n as PortionStep);
          } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const n = steps[Math.max(idx - 1, 0)];
            onChange(n as PortionStep);
          }
        }}
      >
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-3 -translate-y-1/2 rounded-full bg-muted/90 dark:bg-muted/45" />
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-3 -translate-y-1/2 rounded-l-full bg-scanner/35 dark:bg-scanner/30"
          style={{
            width: `${value}%`,
            borderRadius: value >= 100 ? "9999px" : undefined,
          }}
        />
        {steps.map((s) => {
          const active = value === s;
          const pos: CSSProperties =
            s === 0
              ? { left: 0, transform: "translateY(-50%)" }
              : s === 100
                ? { left: "100%", transform: "translate(-100%, -50%)" }
                : { left: `${s}%`, transform: "translate(-50%, -50%)" };
          return (
            <div
              key={s}
              className={cn(
                "pointer-events-none absolute top-1/2 w-1 rounded-full",
                active
                  ? "h-5 bg-scanner dark:bg-scanner"
                  : "h-4 bg-muted-foreground/35 dark:bg-white/30"
              )}
              style={pos}
            />
          );
        })}
        <div
          className={cn(
            "absolute top-1/2 z-[1] h-7 w-7 -translate-y-1/2 rounded-full border-[2.5px] border-scanner",
            "bg-background shadow-md dark:bg-card",
            "ring-2 ring-scanner/25"
          )}
          style={
            value === 0
              ? { left: 0, transform: "translate(0, -50%)" }
              : value === 100
                ? {
                    left: "100%",
                    transform: "translate(-100%, -50%)",
                  }
                : { left: `${value}%`, transform: "translate(-50%, -50%)" }
          }
        />
      </div>

      <div className="relative mt-2 min-h-9">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s as PortionStep)}
            className={cn(
              "absolute top-0 min-h-9 min-w-[2.75rem] px-1 text-center text-sm font-bold tabular-nums transition-colors",
              value === s
                ? "text-scanner"
                : "text-muted-foreground hover:text-foreground/90"
            )}
            style={labelStyle(s)}
          >
            {s}%
          </button>
        ))}
      </div>
    </div>
  );
}
