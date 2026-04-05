"use client";

import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const ITEM_H = 36;

interface DigitalWheelColumnProps {
  values: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  /** 휠 뷰포트 높이(px), 기본 108 (= ITEM_H×3) */
  heightPx?: number;
  className?: string;
  ariaLabel?: string;
  /** 화면에만 다른 포맷 (값 비교는 `values` 원본) */
  formatDisplay?: (value: string) => string;
}

/**
 * 세로 스크롤 + 스냅 중앙 정렬. Apple Watch 스타일 숫자/날짜 택.
 */
export function DigitalWheelColumn({
  values,
  selected,
  onSelect,
  heightPx = 108,
  className,
  ariaLabel,
  formatDisplay,
}: DigitalWheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  /** 브라우저 setTimeout 반환형(number) — Node Timeout과 이원화 방지 */
  const settleRef = useRef<number | undefined>(undefined);

  const padTop = heightPx / 2 - ITEM_H / 2;

  const scrollToIndex = useCallback(
    (idx: number, behavior: ScrollBehavior = "auto") => {
      const el = scrollRef.current;
      if (!el || values.length === 0) return;
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      el.scrollTo({ top: clamped * ITEM_H, behavior });
    },
    [values.length]
  );

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) scrollToIndex(idx, "auto");
  }, [selected, values, scrollToIndex]);

  useEffect(
    () => () => {
      if (settleRef.current !== undefined) {
        window.clearTimeout(settleRef.current);
      }
    },
    []
  );

  const flushSelect = useCallback(() => {
    const el = scrollRef.current;
    if (!el || values.length === 0) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    const targetTop = clamped * ITEM_H;
    if (Math.abs(el.scrollTop - targetTop) > 1) {
      el.scrollTo({ top: targetTop, behavior: "smooth" });
    }
    const next = values[clamped];
    if (next !== selected) onSelect(next);
  }, [onSelect, selected, values]);

  const handleScroll = useCallback(() => {
    if (settleRef.current !== undefined) {
      window.clearTimeout(settleRef.current);
    }
    settleRef.current = window.setTimeout(flushSelect, 100);
  }, [flushSelect]);

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-1 flex-col rounded-xl border border-zinc-200/90 bg-zinc-900/90 shadow-[inset_0_2px_8px_rgba(0,0,0,0.45)]",
        "dark:border-zinc-600/55 dark:bg-[#0c0f14]",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(50%-18px)] rounded-t-xl bg-gradient-to-b from-zinc-900 via-zinc-900/50 to-transparent dark:from-[#0c0f14]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(50%-18px)] rounded-b-xl bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent dark:from-[#0c0f14]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 z-20 h-9 -translate-y-1/2 rounded-md border border-teal-500/35 bg-teal-500/8"
        aria-hidden
      />
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={handleScroll}
        className={cn(
          "scrollbar-hide relative z-0 overflow-y-auto overscroll-contain",
          "snap-y snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden"
        )}
        style={{ height: heightPx, scrollPaddingTop: padTop }}
      >
        <div style={{ paddingTop: padTop, paddingBottom: padTop }}>
          {values.map((v) => {
            const isSel = v === selected;
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={isSel}
                className={cn(
                  "flex h-9 w-full shrink-0 snap-center items-center justify-center font-mono text-[13px] tabular-nums transition-colors",
                  isSel
                    ? "font-bold text-[#4cf3d0]"
                    : "text-zinc-500 hover:text-zinc-400"
                )}
                onClick={() => onSelect(v)}
              >
                {formatDisplay ? formatDisplay(v) : v}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
