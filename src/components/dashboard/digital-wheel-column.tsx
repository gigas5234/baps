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
  /** 날짜·체중 칼럼 테두리 스타일만 구분 (선택 줄은 동일한 타이포로 통일) */
  tone?: "date" | "weight";
}

/**
 * 세로 스크롤 + 스냅 중앙 정렬. 선택 강조는 슬롯 박스 없이 타이포만 사용.
 */
export function DigitalWheelColumn({
  values,
  selected,
  onSelect,
  heightPx = 108,
  className,
  ariaLabel,
  formatDisplay,
  tone = "weight",
}: DigitalWheelColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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
    const aligned = Math.abs(el.scrollTop - targetTop) <= 0.5;
    if (!aligned) {
      el.scrollTo({ top: targetTop, behavior: "smooth" });
    }
    const next = values[clamped];
    if (next !== selected) onSelect(next);
  }, [onSelect, selected, values]);

  const handleScroll = useCallback(() => {
    if (settleRef.current !== undefined) {
      window.clearTimeout(settleRef.current);
    }
    settleRef.current = window.setTimeout(flushSelect, 120);
  }, [flushSelect]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScrollEnd = () => flushSelect();
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [flushSelect]);

  const shell =
    tone === "date"
      ? "rounded-lg border border-dashed border-zinc-400/45 bg-zinc-100/80 dark:border-zinc-500/40 dark:bg-zinc-900/65"
      : "rounded-xl border border-zinc-300/80 bg-zinc-100/90 dark:border-zinc-600/50 dark:bg-zinc-900/80";

  const fadeTop =
    tone === "date"
      ? "from-zinc-100 dark:from-zinc-900"
      : "from-zinc-100 dark:from-zinc-900";
  const fadeMid = "via-zinc-100/60 dark:via-zinc-900/60";

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col shadow-inner",
        shell,
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 h-[calc(50%-18px)] rounded-t-[inherit] bg-gradient-to-b to-transparent",
          fadeTop,
          fadeMid
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[calc(50%-18px)] rounded-b-[inherit] bg-gradient-to-t to-transparent",
          fadeTop,
          fadeMid
        )}
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
        style={{
          height: heightPx,
          scrollPaddingTop: padTop,
          scrollPaddingBottom: padTop,
        }}
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
                  "flex h-9 w-full shrink-0 snap-center snap-always items-center justify-center whitespace-nowrap font-mono text-sm tabular-nums transition-colors",
                  isSel
                    ? "font-semibold text-teal-800 dark:text-teal-300"
                    : "text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400"
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
