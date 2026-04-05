"use client";

import { Camera, Minus, Pencil, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { foodEmojiForName } from "@/lib/food-emoji";
import type { FrequentMeal } from "@/types/database";

const MIN_COUNT_SHOW = 1;

interface QuickLogSliderProps {
  items: FrequentMeal[];
  isLoading: boolean;
  busyId: string | null;
  onPick: (item: FrequentMeal) => void;
  onOpenCamera: () => void;
  onOpenManual: () => void;
  /** 헤더 · 빈 화면에서 자주 먹는 식단 직접 등록 */
  onAddFrequent?: () => void;
  /** 카드별 자주 먹는 식단 항목 삭제 */
  onDeleteFrequent?: (item: FrequentMeal) => void;
}

export function QuickLogSlider({
  items,
  isLoading,
  busyId,
  onPick,
  onOpenCamera,
  onOpenManual,
  onAddFrequent,
  onDeleteFrequent,
}: QuickLogSliderProps) {
  const visible = items.filter((m) => Number(m.count) >= MIN_COUNT_SHOW);

  /** 항목이 1개 이상일 때만 헤더 우측 + (빈 목록일 때는 아래 등록 카드·수동 입력으로만 추가) */
  const headerAddon =
    onAddFrequent != null && visible.length > 0 ? (
      <button
        type="button"
        onClick={onAddFrequent}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/80",
          "text-muted-foreground transition-colors hover:border-primary/45 hover:bg-primary/8 hover:text-foreground",
          "dark:border-white/15"
        )}
        aria-label="자주 먹는 식단 추가"
      >
        <Plus className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>
    ) : null;

  if (isLoading) {
    return (
      <section className="px-4 pb-[1.05rem] pt-[1.05rem]">
        <div className="mb-[1.05rem] flex items-center justify-between gap-2 pr-1">
          <div className="h-4 w-36 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2 overflow-hidden pl-0.5">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-[4.25rem] min-w-[9.5rem] shrink-0 rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (visible.length === 0) {
    return (
      <section className="px-4 pb-[1.4rem] pt-[1.05rem]">
        <div className="mb-[1.05rem] flex items-center justify-between gap-2 pr-1">
          <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Zap
              className="h-6 w-6 shrink-0 text-primary"
              strokeWidth={2}
              aria-hidden
            />
            퀵 로그 · 자주 찾는 식단
          </h2>
        </div>
        <button
          type="button"
          onClick={onAddFrequent ?? onOpenManual}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8",
            "border-muted-foreground/30 bg-transparent transition-colors",
            "hover:border-primary/45 hover:bg-primary/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "dark:border-white/22"
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-center text-sm font-bold leading-snug text-foreground">
            카메라로 찍어서 등록하거나 직접 입력해서 등록하세요
          </span>
          <span className="text-center text-[11px] leading-relaxed text-muted-foreground">
            음식명·영양·식비만 저장하면 퀵 로그에서 원탭으로 기록할 수 있어요
          </span>
        </button>
        <div className="mt-3 flex gap-2.5">
          <button
            type="button"
            onClick={onOpenCamera}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow-md shadow-primary/25",
              "bg-primary text-primary-foreground",
              "ring-1 ring-primary/20 transition-colors hover:bg-primary/90 active:scale-[0.99]"
            )}
          >
            <Camera className="h-4 w-4" aria-hidden />
            카메라
          </button>
          <button
            type="button"
            onClick={onAddFrequent ?? onOpenManual}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium",
              "bg-muted/40 text-foreground",
              "transition-colors hover:bg-muted/65 active:scale-[0.99]",
              "dark:border-white/12 dark:bg-muted/25"
            )}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
            {onAddFrequent != null
              ? "자주 먹는 메뉴 등록하기"
              : "수동 입력"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-[1.05rem] pt-[1.05rem]">
      <div className="mb-[1.05rem] flex items-center justify-between gap-2 pr-1">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <Zap
            className="h-6 w-6 shrink-0 text-primary"
            strokeWidth={2}
            aria-hidden
          />
          퀵 로그 · 자주 찾는 식단
        </h2>
        {headerAddon}
      </div>
      <div
        className={cn(
          "scrollbar-hide flex gap-2.5 overflow-x-auto overflow-y-visible pb-1.5 pl-0.5 pr-3",
          "snap-x snap-mandatory scroll-pl-0.5 [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden"
        )}
      >
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
                "group relative flex min-w-[9.75rem] max-w-[11rem] shrink-0 snap-start items-center gap-2.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-left shadow-sm",
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
                      "flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg",
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
