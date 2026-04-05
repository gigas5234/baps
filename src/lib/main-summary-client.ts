import { mealUtcBoundsForCoachApi } from "@/lib/local-date";

function getLocalTimeLabelKo(d: Date = new Date()): string {
  return d.toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export type MainSummaryApiOk = { line: string; source: "gemini" };
export type MainSummaryApiFallback = { line: null; source: "unavailable"; code?: string };

export async function fetchMainDashboardInsight(params: {
  date: string;
}): Promise<MainSummaryApiOk | MainSummaryApiFallback> {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  const now = new Date();
  const local_hour = now.getHours();
  const local_time_label = getLocalTimeLabelKo(now);

  const res = await fetch("/api/main-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: params.date,
      local_hour,
      local_time_label,
      time_zone: tz,
      meal_utc_bounds: mealUtcBoundsForCoachApi(params.date),
    }),
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return {
      line: null,
      source: "unavailable",
      code: typeof data.code === "string" ? data.code : undefined,
    };
  }
  const line = typeof data.line === "string" ? data.line.trim() : "";
  if (!line) {
    return { line: null, source: "unavailable", code: "EMPTY_LINE" };
  }
  return { line, source: "gemini" };
}
