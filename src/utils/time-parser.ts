import type { MealUtcBounds } from "@/lib/chat-context-server";

/** API 요청 body에서 `meal_utc_bounds` 블록 파싱 (chat·main-summary 공통) */
export function parseMealUtcBounds(
  body: Record<string, unknown>
): MealUtcBounds | null {
  const b = body.meal_utc_bounds;
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const range_start =
    typeof o.range_start === "string" ? o.range_start.trim() : "";
  const day_start =
    typeof o.day_start === "string" ? o.day_start.trim() : "";
  const day_end = typeof o.day_end === "string" ? o.day_end.trim() : "";
  if (!range_start || !day_start || !day_end) return null;
  return { range_start, day_start, day_end };
}

/** `time_zone` 또는 `timeZone` (camelCase) */
export function parseTimeZone(body: Record<string, unknown>): string | null {
  const t =
    typeof body.time_zone === "string"
      ? body.time_zone.trim()
      : typeof (body as { timeZone?: unknown }).timeZone === "string"
        ? String((body as { timeZone: string }).timeZone).trim()
        : "";
  return t || null;
}

function parseLocalHourRaw(
  lh: unknown,
  ctxLh: unknown
): number | undefined {
  const v = lh ?? ctxLh;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** main-summary 등 — body 최상위 `local_hour`만 */
export function parseLocalHour(
  body: Record<string, unknown>
): number | undefined {
  return parseLocalHourRaw(body.local_hour, undefined);
}

/** chat API — `context.local_hour` 폴백 포함 */
export function parseLocalHourHint(
  body: Record<string, unknown>
): number | undefined {
  const ctx = body.context as Record<string, unknown> | undefined;
  return parseLocalHourRaw(body.local_hour, ctx?.local_hour);
}
