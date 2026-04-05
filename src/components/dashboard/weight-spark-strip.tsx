"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { DigitalWheelColumn } from "@/components/dashboard/digital-wheel-column";
import {
  getWeightEntriesInRollingWindow,
  loadWeightEntries,
  upsertWeightEntry,
  WEIGHT_STORAGE_KEY,
} from "@/lib/weight-local-storage";
import { layoutWeightChart } from "@/lib/weight-chart-geometry";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { getLocalYmd } from "@/lib/local-date";

const KG_INT_MIN = 35;
const KG_INT_MAX = 180;
const DATE_WHEEL_DAYS = 120;

function buildDateOptions(days: number): string[] {
  const end = getLocalYmd();
  const endD = new Date(`${end}T12:00:00`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endD);
    d.setDate(endD.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

const KG_INTS = Array.from({ length: KG_INT_MAX - KG_INT_MIN + 1 }, (_, i) =>
  String(KG_INT_MIN + i)
);
const KG_DECS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface WeightSparkStripProps {
  userId: string | undefined;
  selectedDate: string;
  profileKg: number | null | undefined;
  targetWeightKg: number | null | undefined;
  onSavedProfile?: () => void;
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
  const dateOptions = useMemo(() => buildDateOptions(DATE_WHEEL_DAYS), []);
  const [chartWindow, setChartWindow] = useState<7 | 30>(7);
  const [entriesVersion, setEntriesVersion] = useState(0);

  const [pickDate, setPickDate] = useState(selectedDate);
  const [kgInt, setKgInt] = useState("70");
  const [kgDec, setKgDec] = useState("0");
  const [saving, setSaving] = useState(false);

  const bumpEntries = useCallback(() => {
    setEntriesVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const load = () => bumpEntries();
    const onStorage = (e: StorageEvent) => {
      if (e.key === WEIGHT_STORAGE_KEY || e.key === null) load();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("baps-weight-storage", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("baps-weight-storage", load);
    };
  }, [bumpEntries]);

  useEffect(() => {
    if (dateOptions.includes(selectedDate)) {
      setPickDate(selectedDate);
    } else {
      setPickDate(getLocalYmd());
    }
  }, [selectedDate, dateOptions]);

  const chartEntries = useMemo(
    () => getWeightEntriesInRollingWindow(chartWindow),
    [chartWindow, entriesVersion]
  );

  const { pts, pathD, yTarget, minKg, maxKg } = layoutWeightChart(
    chartEntries,
    targetWeightKg
  );
  const hasLine = pathD.length > 0;
  const hasDots = pts.length > 0;

  const entryForPick = useMemo(() => {
    return loadWeightEntries().find((e) => e.date === pickDate);
  }, [pickDate, entriesVersion]);

  useEffect(() => {
    const e = loadWeightEntries().find((x) => x.date === pickDate);
    let seed = e?.kg;
    if (seed == null && pickDate === getLocalYmd() && profileKg != null) {
      seed = profileKg;
    }
    if (seed == null) seed = 70;
    const clamped = Math.min(
      KG_INT_MAX,
      Math.max(KG_INT_MIN, Math.round(seed * 10) / 10)
    );
    const flo = Math.floor(clamped);
    const dec = Math.round((clamped - flo) * 10);
    setKgInt(String(flo));
    setKgDec(String(Math.min(9, Math.max(0, dec))));
  }, [pickDate, profileKg, entriesVersion]);

  const parsedKg =
    Number.parseInt(kgInt, 10) + Number.parseInt(kgDec, 10) / 10;
  const kgValid =
    Number.isFinite(parsedKg) &&
    parsedKg >= KG_INT_MIN &&
    parsedKg <= KG_INT_MAX + 0.9;

  const isToday = pickDate === getLocalYmd();
  const chartHeight = compact
    ? "h-[5.5rem] min-h-[5.5rem]"
    : "h-[6.5rem] min-h-[6.5rem]";

  const lcdTop =
    entryForPick != null
      ? isToday
        ? `오늘 기록: ${entryForPick.kg.toFixed(1)}kg`
        : `${pickDate.slice(5)} 기록: ${entryForPick.kg.toFixed(1)}kg`
      : isToday
        ? "오늘은 아직 미기록"
        : `${pickDate.slice(5)} 미기록`;

  const handleSave = async () => {
    if (!kgValid) return;
    setSaving(true);
    try {
      const kg = Math.round(parsedKg * 10) / 10;
      upsertWeightEntry(pickDate, kg);
      bumpEntries();
      if (userId) {
        const supabase = createClient();
        await supabase.from("profiles").update({ weight: kg }).eq("id", userId);
        onSavedProfile?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={cn(
        "flex min-h-[22rem] flex-col rounded-2xl border shadow-md backdrop-blur-md",
        "border-zinc-300/80 bg-gradient-to-b from-zinc-50 via-white to-zinc-100/90",
        "dark:border-zinc-600/50 dark:from-zinc-800/90 dark:via-zinc-900/80 dark:to-zinc-950/90",
        "mx-0 flex-col px-2 py-2"
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col rounded-xl border bg-white/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
          "dark:bg-zinc-800/40 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          "border-zinc-200/90 dark:border-zinc-600/40"
        )}
      >
        <div className="flex items-center justify-between gap-1.5 px-0.5 pb-1">
          <div className="flex items-center gap-1 text-foreground">
            <Scale
              className="h-3 w-3 shrink-0 text-zinc-500 dark:text-zinc-400"
              strokeWidth={2}
              aria-hidden
            />
            <h3 className="text-[11px] font-semibold tracking-tight">체중계</h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-1 text-[8px] text-muted-foreground">
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

        <div
          className={cn(
            "relative overflow-hidden rounded-lg px-2 py-1.5",
            "bg-[#14181f] shadow-[inset_0_3px_12px_rgba(0,0,0,0.55)]",
            "ring-1 ring-black/20 dark:ring-white/10"
          )}
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_40%)]" />
          <p className="relative text-[8px] font-medium tracking-wider text-teal-500/55 uppercase">
            {lcdTop}
          </p>
          <div
            className={cn(
              "relative flex items-baseline justify-center gap-0.5 font-mono tabular-nums",
              "text-[#4cf3d0] [text-shadow:0_0_12px_rgba(34,211,166,0.35)]",
              "py-0.5"
            )}
          >
            <span
              className={cn(
                "text-xl font-bold tracking-[0.06em]",
                !kgValid && "opacity-45"
              )}
            >
              {kgValid ? parsedKg.toFixed(1) : "--.-"}
            </span>
            <span className="text-xs font-semibold text-teal-400/75">kg</span>
          </div>
        </div>

        <div className="mt-1.5 flex gap-1 px-0.5">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setChartWindow(d)}
              className={cn(
                "flex-1 rounded-md py-0.5 text-[9px] font-semibold transition-colors",
                chartWindow === d
                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                  : "bg-zinc-200/70 text-zinc-600 hover:bg-zinc-300/80 dark:bg-zinc-700/80 dark:text-zinc-300"
              )}
            >
              {d}일 추이
            </button>
          ))}
        </div>

        <div className={cn("relative mt-1 flex", chartHeight)}>
          {hasDots ? (
            <div className="relative grid h-full w-full grid-cols-[1.25rem_1fr] gap-0.5">
              <div className="flex flex-col justify-between py-0.5 text-[7px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                <span>{maxKg.toFixed(1)}</span>
                <span>{minKg.toFixed(1)}</span>
              </div>
              <svg
                className="h-full w-full overflow-visible opacity-95"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label={`체중 ${chartWindow}일 추이`}
              >
                {[25, 50, 75].map((gy) => (
                  <line
                    key={gy}
                    x1={0}
                    x2={100}
                    y1={gy}
                    y2={gy}
                    stroke="currentColor"
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                    className="text-zinc-400/18 dark:text-zinc-500/20"
                  />
                ))}
                {yTarget != null ? (
                  <line
                    x1={0}
                    x2={100}
                    y1={yTarget}
                    y2={yTarget}
                    stroke="currentColor"
                    strokeWidth={1.4}
                    strokeDasharray="4 3"
                    vectorEffect="non-scaling-stroke"
                    className="text-teal-500/55 dark:text-teal-400/45"
                  />
                ) : null}
                {hasLine ? (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.85}
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
                    r={2.5}
                    fill="currentColor"
                    className="text-teal-600 dark:text-teal-400"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center rounded-md border border-dashed border-zinc-300/70 bg-zinc-100/50 px-1 text-center text-zinc-500",
                "dark:border-zinc-600/50 dark:bg-zinc-900/30",
                "text-[9px]"
              )}
            >
              기록이 쌓이면 추이선이 표시됩니다
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex gap-1.5 px-0.5">
        <DigitalWheelColumn
          values={dateOptions}
          selected={pickDate}
          onSelect={setPickDate}
          formatDisplay={(ymd) => ymd.slice(5)}
          ariaLabel="기록 날짜"
          className="min-w-[3.25rem]"
        />
        <DigitalWheelColumn
          values={KG_INTS}
          selected={kgInt}
          onSelect={setKgInt}
          ariaLabel="체중 정수 kg"
        />
        <div className="flex shrink-0 flex-col items-center justify-center px-0.5">
          <span className="font-mono text-lg font-bold text-teal-600 dark:text-teal-400">
            .
          </span>
        </div>
        <DigitalWheelColumn
          values={KG_DECS}
          selected={kgDec}
          onSelect={setKgDec}
          ariaLabel="체중 소수 첫째"
          className="min-w-[2.5rem]"
        />
      </div>

      <button
        type="button"
        disabled={saving || !kgValid}
        onClick={handleSave}
        className={cn(
          "mt-2 w-full shrink-0 rounded-xl py-2 text-[11px] font-bold shadow-md transition-all active:scale-[0.99]",
          "bg-[var(--gauge-safe)] text-white shadow-[var(--gauge-safe)]/30",
          "hover:brightness-105 disabled:pointer-events-none disabled:opacity-45",
          "dark:text-zinc-950"
        )}
      >
        {saving ? "저장 중…" : "측정 저장"}
      </button>

      <p className="mt-2 border-t border-zinc-200/80 px-0.5 pt-2 text-center text-[10px] font-semibold leading-snug text-foreground dark:border-zinc-600/50">
        정확한 측정이 결과를 만듭니다. 기록하십시오.
      </p>
    </section>
  );
}
