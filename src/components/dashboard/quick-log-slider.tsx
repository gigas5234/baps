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
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="aspect-square w-[4.5rem] shrink-0 rounded-2xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (visible.length === 0) {
    return (
      <section className="px-4 pb-3 pt-1">
        <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          자주 찾는 식단
        </h2>
        <button
          type="button"
          onClick={onOpenCamera}
          className="w-full rounded-2xl border border-dashed border-grid-line bg-muted/20 px-4 py-4 text-left transition-colors hover:bg-muted/35"
        >
          <p className="text-sm font-medium text-foreground leading-snug">
            아직 자주 먹는 식단이 없어요. 첫 식단을 기록하고 &apos;자주 먹는
            메뉴&apos;로 등록해 보세요!
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
              <Camera className="h-3.5 w-3.5" />
              사진으로 기록
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-scanner/15 px-3 py-2 text-xs font-medium text-scanner">
              <Pencil className="h-3.5 w-3.5" />
              직접 입력
            </span>
          </div>
        </button>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={onOpenCamera}
            className="flex-1 rounded-xl border border-border py-2.5 text-xs font-medium hover:bg-muted/60"
          >
            카메라
          </button>
          <button
            type="button"
            onClick={onOpenManual}
            className="flex-1 rounded-xl border border-border py-2.5 text-xs font-medium hover:bg-muted/60"
          >
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
      <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1 -mx-0.5 px-0.5">
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
                "group flex w-[4.75rem] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition-[transform,box-shadow] active:scale-[0.98]",
                "hover:border-primary/35 hover:shadow-md",
                "disabled:pointer-events-none disabled:opacity-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className="relative aspect-square w-full bg-muted">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 to-scanner/15 px-1 text-center font-data text-[10px] font-semibold text-primary leading-tight">
                    {m.food_name.slice(0, 8)}
                    {m.food_name.length > 8 ? "…" : ""}
                  </div>
                )}
                {busy ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/55 text-[10px] font-medium">
                    …
                  </div>
                ) : null}
              </div>
              <p className="line-clamp-2 px-1.5 py-1.5 text-[10px] font-medium leading-tight text-foreground">
                {m.food_name}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
