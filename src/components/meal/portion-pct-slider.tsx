"use client";

import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** 0–100 정수 (1단위) */
export type PortionPct = number;

/** w-7 h-7 — 트랙 좌우 inset으로 0·100에서도 중앙 정렬 */
const THUMB_PX = 28;

function clampPct(n: number): PortionPct {
  return Math.max(0, Math.min(100, Math.round(n))) as PortionPct;
}

interface PortionPctSliderProps {
  value: PortionPct;
  onChange: (pct: PortionPct) => void;
  className?: string;
}

/**
 * 0~100% · 1단위 — 트랙 드래그 + 좌우 이동 버튼
 */
export function PortionPctSlider({
  value,
  onChange,
  className,
}: PortionPctSliderProps) {
  const v = clampPct(value);
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const innerW = r.width - THUMB_PX;
      const x = clientX - r.left - THUMB_PX / 2;
      const ratio = innerW > 0 ? Math.max(0, Math.min(1, x / innerW)) : 0;
      onChange(clampPct(ratio * 100));
    },
    [onChange]
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

  const pad = THUMB_PX / 2;

  return (
    <div
      className={cn(
        "flex touch-none select-none items-center gap-2",
        className
      )}
    >
      <button
        type="button"
        aria-label="비율 1% 감소"
        disabled={v <= 0}
        onClick={() => onChange(clampPct(v - 1))}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40",
          "text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35",
          "dark:border-white/12 dark:bg-zinc-800/80"
        )}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>

      <div className="min-w-0 flex-1 px-0.5">
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={v}
          aria-valuetext={`${v}%`}
          aria-label="섭취 비율 0~100%"
          tabIndex={0}
          className={cn(
            "relative h-10 cursor-grab py-1 active:cursor-grabbing",
            "rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scanner/50 focus-visible:ring-offset-2"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowUp") {
              e.preventDefault();
              onChange(clampPct(v + 1));
            } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clampPct(v - 1));
            }
          }}
        >
          <div
            className="pointer-events-none absolute top-1/2 right-[14px] left-[14px] h-2.5 -translate-y-1/2 rounded-full bg-muted/90 dark:bg-muted/45"
          />
          <div
            className={cn(
              "pointer-events-none absolute top-1/2 left-[14px] h-2.5 -translate-y-1/2 rounded-l-full bg-scanner/40 dark:bg-scanner/35",
              v >= 100 && "rounded-r-full"
            )}
            style={{
              width:
                v <= 0
                  ? 0
                  : `max(0px, calc((100% - ${THUMB_PX}px) * ${v} / 100))`,
            }}
          />
          <div
            className={cn(
              "absolute top-1/2 z-[1] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-scanner",
              "bg-background shadow-md ring-2 ring-scanner/20 dark:bg-card"
            )}
            style={{
              left: `calc(${pad}px + (100% - ${THUMB_PX}px) * ${v} / 100)`,
            }}
          />
        </div>
      </div>

      <button
        type="button"
        aria-label="비율 1% 증가"
        disabled={v >= 100}
        onClick={() => onChange(clampPct(v + 1))}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40",
          "text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-35",
          "dark:border-white/12 dark:bg-zinc-800/80"
        )}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
