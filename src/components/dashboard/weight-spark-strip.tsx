"use client";

import { useEffect, useState } from "react";
import { Scale } from "lucide-react";
import {
  getChartWeightEntries,
  upsertWeightEntry,
  WEIGHT_STORAGE_KEY,
} from "@/lib/weight-local-storage";
import { layoutWeightChart } from "@/lib/weight-chart-geometry";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { getLocalYmd } from "@/lib/local-date";

const CHART_DOTS = 7;

interface WeightSparkStripProps {
  userId: string | undefined;
  selectedDate: string;
  profileKg: number | null | undefined;
  /** 프로필에 저장된 목표 몸무게 — 점선 기준선 */
  targetWeightKg: number | null | undefined;
  onSavedProfile?: () => void;
  /** 물 카드와 한 줄 배치 시 */
  compact?: boolean;
}

export function WeightSparkStrip({
  userId,
  selectedDate,
  profileKg,
  targetWeightKg,
  onSavedProfile,
  compact = false,
}: WeightSparkStripProps) {
  const [entries, setEntries] = useState(() => getChartWeightEntries(CHART_DOTS));
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = () => setEntries(getChartWeightEntries(CHART_DOTS));
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === WEIGHT_STORAGE_KEY || e.key === null) load();
    };
    const onCustom = () => load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("baps-weight-storage", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("baps-weight-storage", onCustom);
    };
  }, [selectedDate]);

  const { pts, pathD, yTarget } = layoutWeightChart(entries, targetWeightKg);
  const hasLine = pathD.length > 0;
  const hasDots = pts.length > 0;

  const isToday = selectedDate === getLocalYmd();
  const entryForSelected = entries.find((e) => e.date === selectedDate);
  const latestEntry =
    entries.length > 0 ? entries[entries.length - 1] : undefined;

  const parsedInput = parseFloat(input.replace(",", "."));
  const inputPreview =
    Number.isFinite(parsedInput) && parsedInput > 0 && parsedInput <= 500
      ? parsedInput
      : null;

  const lcdKg = inputPreview ?? entryForSelected?.kg ?? null;
  const lcdSecondary =
    inputPreview != null
      ? "입력 중"
      : entryForSelected
        ? isToday
          ? "이 날 기록됨"
          : `${selectedDate.slice(5)} 기록`
        : latestEntry
          ? `최근 ${latestEntry.date.slice(5)} · ${latestEntry.kg}kg`
          : "측정값을 입력하세요";

  const formatLcd = (v: number | null) =>
    v != null ? v.toFixed(1) : "--.-";

  const handleSave = async () => {
    const kg = parseFloat(input.replace(",", "."));
    if (!Number.isFinite(kg) || kg <= 0 || kg > 500) return;
    setSaving(true);
    try {
      upsertWeightEntry(selectedDate, kg);
      setEntries(getChartWeightEntries(CHART_DOTS));
      setInput("");
      if (userId) {
        const supabase = createClient();
        await supabase.from("profiles").update({ weight: kg }).eq("id", userId);
        onSavedProfile?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const chartHeight = compact ? "h-[2.75rem] min-h-[2.75rem]" : "h-[4.25rem]";

  return (
    <section
      className={cn(
        "rounded-2xl border shadow-md backdrop-blur-md",
        "border-zinc-300/80 bg-gradient-to-b from-zinc-50 via-white to-zinc-100/90",
        "dark:border-zinc-600/50 dark:from-zinc-800/90 dark:via-zinc-900/80 dark:to-zinc-950/90",
        compact
          ? "mx-0 flex h-full min-h-0 flex-col px-2 py-2"
          : "mx-4 px-3 py-3"
      )}
    >
      {/* 상판: 유리 체중계 테두리 느낌 */}
      <div
        className={cn(
          "rounded-xl border bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
          "dark:bg-zinc-800/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          "border-zinc-200/90 dark:border-zinc-600/40"
        )}
      >
        <div className="flex items-center justify-between gap-1.5 px-0.5 pb-1">
          <div className="flex items-center gap-1 text-foreground">
            <Scale
              className={cn(
                "shrink-0 text-zinc-500 dark:text-zinc-400",
                compact ? "h-3 w-3" : "h-3.5 w-3.5"
              )}
              strokeWidth={2}
              aria-hidden
            />
            <h3
              className={cn(
                "font-semibold tracking-tight",
                compact ? "text-[11px]" : "text-xs"
              )}
            >
              체중계
            </h3>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center justify-end gap-x-1 text-muted-foreground",
              compact ? "text-[8px]" : "text-[10px]"
            )}
          >
            {targetWeightKg != null && targetWeightKg > 0 ? (
              <span className="tabular-nums text-primary/90">
                목표 {targetWeightKg}kg
              </span>
            ) : null}
            {profileKg != null ? (
              <span className="tabular-nums">프로필 {profileKg}</span>
            ) : null}
          </div>
        </div>

        {/* LCD 패널 */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg px-2 py-1.5",
            "bg-[#14181f] shadow-[inset_0_3px_12px_rgba(0,0,0,0.55)]",
            "ring-1 ring-black/20 dark:ring-white/10"
          )}
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_40%)]" />
          <p
            className={cn(
              "relative text-[9px] font-medium tracking-wider text-teal-500/50 uppercase",
              compact && "text-[8px]"
            )}
          >
            {lcdSecondary}
          </p>
          <div
            className={cn(
              "relative flex items-baseline justify-center gap-0.5 font-mono tabular-nums",
              "text-[#4cf3d0] [text-shadow:0_0_12px_rgba(34,211,166,0.35)]",
              compact ? "py-0.5" : "py-1"
            )}
          >
            <span
              className={cn(
                "font-bold tracking-[0.08em]",
                compact ? "text-xl" : "text-2xl",
                lcdKg == null && "opacity-45"
              )}
            >
              {formatLcd(lcdKg)}
            </span>
            <span
              className={cn(
                "font-semibold text-teal-400/75",
                compact ? "text-xs" : "text-sm"
              )}
            >
              kg
            </span>
          </div>
        </div>

        {/* 추이 미니 그래프 (유리 판 아래) */}
        <div className={cn("mt-1.5 flex items-stretch", chartHeight)}>
          {hasDots ? (
            <svg
              className="h-full w-full overflow-visible opacity-95"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              role="img"
              aria-label="체중 추이 차트"
            >
              {yTarget != null ? (
                <line
                  x1={0}
                  x2={100}
                  y1={yTarget}
                  y2={yTarget}
                  stroke="currentColor"
                  strokeWidth={1.25}
                  strokeDasharray="5 4"
                  vectorEffect="non-scaling-stroke"
                  className="text-teal-600/35 dark:text-teal-400/30"
                />
              ) : null}
              {hasLine ? (
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="text-teal-600 dark:text-teal-400"
                />
              ) : null}
              {pts.map((p) => (
                <circle
                  key={p.date}
                  cx={p.x}
                  cy={p.y}
                  r={compact ? 2.4 : 2.8}
                  fill="currentColor"
                  className="text-teal-600 dark:text-teal-400"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center rounded-md border border-dashed border-zinc-300/70 bg-zinc-100/50 text-muted-foreground",
                "dark:border-zinc-600/50 dark:bg-zinc-900/30",
                compact ? "text-[9px] px-1 text-center" : "text-[11px]"
              )}
            >
              기록하면 그래프가 나타나요
            </div>
          )}
        </div>
      </div>

      {!compact ? (
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          선택한 날짜에 맞춰 기록해요. 최대 {CHART_DOTS}일·점까지 차트에
          연결돼요. 오늘 저장 시 프로필 체중도 같이 맞춰요.
        </p>
      ) : null}

      <div
        className={cn(
          "mt-1.5 flex gap-1.5",
          compact ? "mt-1.5" : "mt-2"
        )}
      >
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={isToday ? "0.0" : `${selectedDate.slice(5)}`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-zinc-300/90 bg-white/90 font-mono tabular-nums text-foreground shadow-sm",
            "placeholder:text-zinc-400 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/25",
            "dark:border-zinc-600 dark:bg-zinc-900/80 dark:placeholder:text-zinc-500",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
          )}
        />
        <button
          type="button"
          disabled={saving || !input}
          onClick={handleSave}
          className={cn(
            "shrink-0 rounded-lg border border-zinc-400/40 bg-zinc-200/90 font-semibold text-zinc-800 shadow-sm",
            "transition-colors hover:bg-zinc-300/90 active:scale-[0.98] disabled:opacity-40",
            "dark:border-zinc-500/40 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600",
            compact ? "px-2.5 py-1.5 text-[10px]" : "px-3 py-2 text-xs"
          )}
        >
          {saving ? "…" : "측정 저장"}
        </button>
      </div>
    </section>
  );
}
