"use client";

import { Minus, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { foodEmojiForName } from "@/lib/food-emoji";
import type { FrequentMeal } from "@/types/database";

const MIN_COUNT_SHOW = 1;

/** 카드 한 장과 동일한 가로·세로 감각 (고스트 칩) */
const CHIP_MIN_W = "min-w-[9.75rem]";
const CHIP_MAX_W = "max-w-[11rem]";

interface QuickLogSliderProps {
  items: FrequentMeal[];
  isLoading: boolean;
  busyId: string | null;
  onPick: (item: FrequentMeal) => void;
  /** 카메라·직접 입력 — 바텀시트 오픈 */
  onOpenAddSheet: () => void;
  /** 카드별 자주 먹는 식단 항목 삭제 */
  onDeleteFrequent?: (item: FrequentMeal) => void;
}

function GhostRegisterChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 snap-start items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3",
        "min-h-[4.25rem] py-2.5",
        CHIP_MIN_W,
        CHIP_MAX_W,
        "border-muted-foreground/25 bg-muted/10 transition-colors",
        "hover:border-primary/40 hover:bg-primary/6 active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "dark:border-white/18 dark:bg-muted/15"
      )}
      aria-label="메뉴 등록"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </span>
      <span className="text-xs font-semibold text-muted-foreground">
        메뉴 등록
      </span>
    </button>
  );
}

export function QuickLogSlider({
  items,
  isLoading,
  busyId,
  onPick,
  onOpenAddSheet,
  onDeleteFrequent,
}: QuickLogSliderProps) {
  const visible = items.filter((m) => Number(m.count) >= MIN_COUNT_SHOW);

  const headerAddon = (
    <button
      type="button"
      onClick={onOpenAddSheet}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80",
        "text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/8 hover:text-foreground",
        "dark:border-white/15"
      )}
      aria-label="메뉴 등록"
    >
      <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
    </button>
  );

  if (isLoading) {
    return (
      <section className="px-4 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between gap-2 pr-1">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-hidden pl-0.5">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-[4.25rem] min-w-[9.5rem] shrink-0 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-3 pt-3">
      <div className="mb-3 flex items-center justify-between gap-2 pr-1">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-foreground sm:text-lg">
          <Zap
            className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
            strokeWidth={2}
            aria-hidden
          />
          퀵 로그 · 자주 찾는 식단
        </h2>
        {headerAddon}
      </div>
      <div
        className={cn(
          "scrollbar-hide flex gap-2.5 overflow-x-auto overflow-y-visible pb-1 pl-0.5 pr-3",
          "snap-x snap-mandatory scroll-pl-0.5 [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
          "touch-pan-x"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <GhostRegisterChip onClick={onOpenAddSheet} />
        {visible.map((m) => {
          const busy = busyId === m.id;
          const src = m.image_url?.trim();
          return (
            <button
              key={m.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(m)}
              className={cn(
                "group relative flex shrink-0 snap-start items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-sm",
                CHIP_MIN_W,
                CHIP_MAX_W,
                "transition-[transform,box-shadow,border-color] active:scale-[0.98]",
                "hover:border-primary/35 hover:shadow-md hover:shadow-primary/8",
                "disabled:pointer-events-none disabled:opacity-55",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "dark:border-white/12"
              )}
            >
              {onDeleteFrequent ? (
                <span className="absolute right-1 top-1 z-10">
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteFrequent(m);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onDeleteFrequent(m);
                      }
                    }}
                    className={cn(
                      "flex h-7 w-7 cursor-pointer items-center justify-center rounded-xl",
                      "border border-border/80 bg-background/90 text-muted-foreground shadow-sm",
                      "transition-colors hover:border-destructive/45 hover:text-destructive",
                      "dark:border-white/12 dark:bg-zinc-900/95"
                    )}
                    aria-label={`${m.food_name} 자주 먹는 식단에서 삭제`}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} />
                  </span>
                </span>
              ) : null}
              <div
                className={cn(
                  "relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted",
                  "ring-1 ring-border group-hover:ring-primary/40",
                  busy && "ring-primary/50"
                )}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/18 to-scanner/16 text-[1.35rem] leading-none"
                    aria-hidden
                  >
                    {foodEmojiForName(m.food_name)}
                  </div>
                )}
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 text-xs font-medium">
                    …
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pr-6">
                <p className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
                  {m.food_name}
                </p>
                <p className="mt-1 font-data text-[11px] font-bold tabular-nums text-muted-foreground">
                  {m.cal.toLocaleString()}
                  <span className="ml-0.5 text-[10px] font-semibold">kcal</span>
                  {m.price_won != null && Number(m.price_won) > 0 ? (
                    <span className="ml-1.5 font-semibold text-muted-foreground/90">
                      · {Number(m.price_won).toLocaleString()}원
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
