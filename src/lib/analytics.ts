/**
 * 관측용 훅 자리 — Sentry / LogSnag 등은 여기서 래핑하면 됨.
 * 기본은 dev에서만 console.debug.
 */
export function trackBapsEvent(
  name: string,
  props?: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "development") {
    console.debug("[baps]", name, props ?? {});
  }
}
