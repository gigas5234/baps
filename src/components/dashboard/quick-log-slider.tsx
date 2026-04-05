"use client";

import { Camera, Pencil, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FrequentMeal } from "@/types/database";

const MIN_COUNT_SHOW = 1;

interface QuickLogSliderProps {
  items: FrequentMeal[];
  isLoading: boolean;
  busyId: string | null;
  onPick: (item: FrequentMeal) => void;
  onOpenCamera: () => void;
  onOpenManual: () => void;
}

export function QuickLogSlider({
  items,
  isLoading,
  busyId,
  onPick,
  onOpenCamera,
  onOpenManual,
}: QuickLogSliderProps) {
  const visible = items.filter((m) => Number(m.count) >= MIN_COUNT_SHOW);

  if (isLoading) {
    return (
      <section className="px-4 pb-2 pt-1">
        <div className="mb-2 h-4 w-36 rounded bg-muted animate-pulse" />
        <div className="flex gap-3 overflow-hidden pl-0.5">
          {[1, 2, 3, 4].map((k) => (
            <div
              key={k}
              className="h-16 w-16 shrink-0 rounded-full bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (visible.length === 0) {
    return (
      <section className="px-4 pb-3 pt-1">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          자주 찾는 식단
        </h2>
        {/* 슬롯: 채워질 자리 — 클릭 대상 아님 */}
        <div
          className={cn(
            "rounded-2xl border-2 border-dashed border-muted-foreground/25 px-4 py-4",
            "bg-transparent dark:border-white/18"
          )}
        >
          <p className="text-center text-xs font-medium leading-relaxed text-muted-foreground">
            자주 먹는 식단을 등록하면 클릭 한 번으로 기록할 수 있어요.
          </p>
        </div>
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
            onClick={onOpenManual}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium",
              "bg-muted/40 text-foreground",
              "transition-colors hover:bg-muted/65 active:scale-[0.99]",
              "dark:border-white/12 dark:bg-muted/25"
            )}
          >
            <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
            수동 입력
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 pb-2 pt-1">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        자주 찾는 식단
      </h2>
      <div
        className={cn(
          "scrollbar-hide flex gap-3 overflow-x-auto overflow-y-visible pb-1.5 pl-0.5 pr-3",
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
                "group flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-1.5 text-center",
                "transition-transform active:scale-[0.97]",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
              )}
            >
              <div
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-offset-2 ring-offset-background transition-[box-shadow,ring-color]",
                  "ring-border group-hover:ring-primary/45",
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
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-scanner/18 px-1 text-center font-data text-[9px] font-semibold text-primary leading-tight">
                    {m.food_name.slice(0, 5)}
                    {m.food_name.length > 5 ? "…" : ""}
                  </div>
                )}
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/55 text-[10px] font-medium">
                    …
                  </div>
                ) : null}
              </div>
              <p className="line-clamp-2 w-full text-[10px] font-medium leading-tight text-foreground">
                {m.food_name}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
