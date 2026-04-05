"use client";

/** 메인 대시보드 로딩 — 상황판 게이지·퀵로그 카드·타임라인·2컬럼 습관 */
export function HomeDashboardSkeleton() {
  return (
    <>
      <section className="space-y-3 px-4 pb-4 pt-3" aria-hidden>
        <div className="h-7 w-48 rounded-md bg-muted/90 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-md bg-muted/80 animate-pulse" />
          <div className="h-14 rounded-xl border border-border/70 bg-muted/40 animate-pulse" />
        </div>
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="mx-auto mb-2 h-6 w-28 rounded-full bg-muted/90 animate-pulse" />
          <div className="flex flex-col items-center">
            <div className="relative h-[118px] w-[220px]">
              <div className="absolute inset-x-6 top-2 h-[88px] rounded-t-[100px] border-[14px] border-muted bg-muted/15 animate-pulse" />
              <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
                <div className="h-2.5 w-14 rounded bg-muted/80 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-4 h-3 w-[88%] rounded bg-muted/70 animate-pulse" />
          <div className="mx-auto mt-2 space-y-1.5 pt-2">
            <div className="h-1 w-full rounded-full bg-muted/60 animate-pulse" />
            <div className="h-1 w-full rounded-full bg-muted/60 animate-pulse" />
            <div className="h-1 w-full rounded-full bg-muted/60 animate-pulse" />
          </div>
          <div className="mx-auto mt-4 h-8 w-[90%] rounded-md bg-muted/50 animate-pulse" />
        </div>
      </section>

      <section className="px-4 pb-3 pt-3" aria-hidden>
        <div className="mb-3 h-6 w-44 rounded-md bg-muted animate-pulse" />
        <div className="flex gap-2.5">
          {[1, 2, 3].map((k) => (
            <div
              key={k}
              className="h-[4.25rem] min-w-[9.75rem] shrink-0 rounded-2xl border border-border/60 bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      </section>

      <section className="px-4 py-2" aria-hidden>
        <div className="mb-2 space-y-1">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-32 rounded bg-muted/70 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3"
            >
              <div className="h-14 w-14 shrink-0 rounded-xl bg-muted animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2 py-0.5">
                <div className="h-7 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-[70%] max-w-[180px] rounded bg-muted/80 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 pb-3 pt-1" aria-hidden>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-h-[200px] rounded-2xl border border-border/80 bg-card p-2.5 shadow-sm">
            <div className="mx-auto mt-2 h-20 w-16 rounded bg-muted/80 animate-pulse" />
            <div className="mt-3 flex justify-between px-1">
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
              <div className="h-7 w-10 rounded bg-muted animate-pulse" />
              <div className="h-9 w-9 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
          <div className="min-h-[200px] rounded-2xl border border-border/80 bg-card p-2.5 shadow-sm">
            <div className="h-3 w-full rounded bg-muted/70 animate-pulse" />
            <div className="mt-2 h-[3rem] w-full rounded-lg bg-muted/40 animate-pulse" />
            <div className="mt-2 flex gap-2">
              <div className="h-8 flex-1 rounded-xl bg-muted animate-pulse" />
              <div className="h-8 w-10 rounded-xl bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
