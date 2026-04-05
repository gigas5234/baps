"use client";

import { useEffect, useState } from "react";
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
}

export function WeightSparkStrip({
  userId,
  selectedDate,
  profileKg,
  targetWeightKg,
  onSavedProfile,
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

  const isToday = selectedDate === getLocalYmd();

  return (
    <section
      className={cn(
        "mx-4 rounded-2xl border border-border/60 bg-background/50 px-3 py-3",
        "shadow-sm backdrop-blur-md dark:bg-background/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">체중 추이</h3>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {profileKg != null ? <span>프로필 {profileKg}kg</span> : null}
          {targetWeightKg != null && targetWeightKg > 0 ? (
            <span className="text-primary/90">목표 {targetWeightKg}kg</span>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
        입력한 날만 연결됩니다. 차트에는 최신 기록 최대 {CHART_DOTS}일·점만
        보여요. {isToday ? "오늘" : "선택한 날"} 체중을 넣으면 프로필
        몸무게도 맞춰요. 설정에서 목표 몸무게를 넣으면 점선이 표시돼요.
      </p>

      <div className="mt-2 flex h-[4.25rem] items-stretch">
        {hasDots ? (
          <svg
            className="h-full w-full overflow-visible"
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
                className="text-primary/45"
              />
            ) : null}
            {hasLine ? (
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.25}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="text-primary"
              />
            ) : null}
            {pts.map((p) => (
              <circle
                key={p.date}
                cx={p.x}
                cy={p.y}
                r={2.8}
                fill="currentColor"
                className="text-primary"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-grid-line bg-muted/25 text-[11px] text-muted-foreground">
            기록하면 날짜 간격으로 최대 {CHART_DOTS}점까지 선이 그려져요
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          placeholder={isToday ? "오늘 체중 (kg)" : `${selectedDate} 체중`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-data min-w-0 flex-1 rounded-xl border bg-background/80 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={saving || !input}
          onClick={handleSave}
          className="shrink-0 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-40"
        >
          {saving ? "…" : "저장"}
        </button>
      </div>
    </section>
  );
}
