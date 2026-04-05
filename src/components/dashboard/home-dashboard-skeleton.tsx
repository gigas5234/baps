"use client";

/** 메인 대시보드 로딩 — 콤팩트 게이지·퀵로그·타임라인·2컬럼 습관 */
export function HomeDashboardSkeleton() {
  return (
    <>
      <section className="space-y-2 px-4 pb-2 pt-1" aria-hidden>
        <div className="h-14 rounded-xl border border-border/70 bg-muted/40 animate-pulse" />
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative h-[92px] w-[168px]">
              <div className="absolute inset-x-3 top-1 h-[72px] rounded-t-[100px] border-[10px] border-muted bg-muted/15 animate-pulse" />
              <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
                <div className="h-6 w-16 rounded-md bg-muted animate-pulse" />
                <div className="h-2.5 w-12 rounded bg-muted/80 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-2 pt-1" aria-hidden>
        <div className="mb-2 h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((k) => (
            <div
              key={k}
              className="h-16 w-16 shrink-0 rounded-full bg-muted animate-pulse"
            />
          ))}
        </div>
      </section>

      <section className="px-4 py-2" aria-hidden>
        <div className="mb-2 h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card p-3"
            >
              <div className="h-14 w-14 shrink-0 rounded-xl bg-muted animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2 py-1">
                <div className="h-4 w-[72%] max-w-[200px] rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/70 animate-pulse" />
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
