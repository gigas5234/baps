"use client";

/** 메인 대시보드 로딩용 — 게이지·물·타임라인 실루엣 */
export function HomeDashboardSkeleton() {
  return (
    <>
      <section className="px-4 py-3" aria-hidden>
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative h-[125px] w-[220px]">
              <div className="absolute inset-x-4 top-2 h-[100px] rounded-t-[100px] border-[12px] border-muted bg-muted/15 animate-pulse" />
              <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
                <div className="h-8 w-24 rounded-md bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted/80 animate-pulse" />
              </div>
            </div>
            <div className="mt-2 h-4 w-40 rounded bg-muted/90 animate-pulse" />
            <div className="mt-4 flex gap-8">
              <div className="h-10 w-14 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 w-px bg-border" />
              <div className="h-10 w-14 rounded-lg bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-2" aria-hidden>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-muted animate-pulse" />
            <div className="min-w-0 flex-1 space-y-2 pt-0.5">
              <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
              <div className="h-3 w-36 rounded bg-muted/70 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted animate-pulse" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse" />
            <div className="flex flex-1 flex-col items-center gap-1 px-2">
              <div className="h-7 w-10 rounded bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded bg-muted/70 animate-pulse" />
            </div>
            <div className="h-12 w-12 rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
      </section>

      <section className="px-4 py-3" aria-hidden>
        <div className="mb-3 h-4 w-28 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
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
    </>
  );
}
