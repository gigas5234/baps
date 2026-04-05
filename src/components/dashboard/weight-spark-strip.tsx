"use client";

import { useCallback, useEffect, useMemo, useState, useId, type ReactNode } from "react";
import { Scale } from "lucide-react";
import { DigitalWheelColumn } from "@/components/dashboard/digital-wheel-column";
import {
  getChartWeightEntries,
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
const CHART_POINTS = 7;

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

function formatKoreanDay(ymd: string): string {
  const mo = Number(ymd.slice(5, 7));
  const day = Number(ymd.slice(8, 10));
  if (!Number.isFinite(mo) || !Number.isFinite(day)) return ymd;
  return `${mo}월 ${day}일`;
}

const KG_INTS = Array.from({ length: KG_INT_MAX - KG_INT_MIN + 1 }, (_, i) =>
  String(KG_INT_MIN + i)
);
const KG_DECS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function CoachFootnote({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "mt-2 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2",
        "dark:border-white/10 dark:bg-muted/15"
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        관제 코멘트
      </p>
      <p className="mt-1 text-[10px] font-medium leading-relaxed text-foreground/90">
        {children}
      </p>
    </div>
  );
}

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
  const clipUid = useId().replace(/:/g, "");
  const dateOptions = useMemo(() => buildDateOptions(DATE_WHEEL_DAYS), []);
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

  /** 최근 기록 N개만 (7일 창이 아닌 “마지막 7포인트”) */
  const chartEntries = useMemo(() => {
    void entriesVersion;
    return getChartWeightEntries(CHART_POINTS);
  }, [entriesVersion]);

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
    ? "h-[5.25rem] min-h-[5.25rem]"
    : "h-24 min-h-24";

  const lcdTop =
    entryForPick != null
      ? isToday
        ? `오늘 기록: ${entryForPick.kg.toFixed(1)} kg`
        : `${formatKoreanDay(pickDate)} 기록: ${entryForPick.kg.toFixed(1)} kg`
      : isToday
        ? "오늘은 아직 미기록"
        : `${formatKoreanDay(pickDate)} · 기록 없음`;

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
        "flex min-h-[22rem] flex-col rounded-2xl border shadow-sm",
        "border-border/80 bg-card/80",
        "dark:border-white/10 dark:bg-card/40",
        "mx-0 flex-col px-2 py-2"
      )}
    >
      <div
        className={cn(
          "flex flex-1 flex-col rounded-xl border border-border/60 bg-muted/20 p-1.5",
          "dark:border-white/10 dark:bg-muted/10"
        )}
      >
        <div className="flex items-center justify-between gap-1.5 px-0.5 pb-1">
          <div className="flex items-center gap-1 text-foreground">
            <Scale
              className="h-3 w-3 shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <h3 className="text-[11px] font-semibold tracking-tight">
              체중계
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-x-1.5 text-[8px] text-muted-foreground">
            {targetWeightKg != null && targetWeightKg > 0 ? (
              <span className="tabular-nums">목표 {targetWeightKg}kg</span>
            ) : null}
            {profileKg != null ? (
              <span className="tabular-nums">프로필 {profileKg}</span>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-lg px-2 py-1.5",
            "bg-zinc-900/88 dark:bg-zinc-950/90",
            "ring-1 ring-black/10 dark:ring-white/10"
          )}
          aria-live="polite"
        >
          <p className="relative text-[8px] font-medium tracking-wide text-zinc-400">
            {lcdTop}
          </p>
          <div
            className={cn(
              "relative flex items-baseline justify-center gap-0.5 py-0.5",
              "font-data tabular-nums text-zinc-50"
            )}
          >
            <span
              className={cn(
                "text-xl font-semibold tracking-tight",
                !kgValid && "opacity-45"
              )}
            >
              {kgValid ? parsedKg.toFixed(1) : "--.-"}
            </span>
            <span className="text-xs font-medium text-zinc-400">kg</span>
          </div>
        </div>

        <p className="mt-1.5 px-0.5 text-[9px] text-muted-foreground">
          최근 기록 <span className="font-mono font-semibold">{CHART_POINTS}회</span>
          추이 · 목표선 점선
        </p>

        <div
          className={cn(
            "relative mt-1 min-h-0 overflow-hidden rounded-md border border-border/50 bg-background/50 dark:bg-background/25",
            chartHeight
          )}
        >
          {hasDots ? (
            <div className="grid h-full w-full grid-cols-[1.35rem_1fr] gap-0.5 p-0.5">
              <div className="flex flex-col justify-between py-0.5 text-[7px] font-mono tabular-nums text-muted-foreground">
                <span>{maxKg.toFixed(1)}</span>
                <span>{minKg.toFixed(1)}</span>
              </div>
              <svg
                className="h-full max-h-full w-full"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                overflow="hidden"
                role="img"
                aria-label="체중 최근 기록 추이"
              >
                <defs>
                  <clipPath id={`wchart-clip-${clipUid}`}>
                    <rect x={0} y={0} width={100} height={100} rx={0} />
                  </clipPath>
                </defs>
                <g clipPath={`url(#wchart-clip-${clipUid})`}>
                  {[25, 50, 75].map((gy) => (
                    <line
                      key={gy}
                      x1={0}
                      x2={100}
                      y1={gy}
                      y2={gy}
                      stroke="currentColor"
                      strokeWidth={0.55}
                      vectorEffect="non-scaling-stroke"
                      className="text-muted-foreground/15"
                    />
                  ))}
                  {yTarget != null ? (
                    <line
                      x1={0}
                      x2={100}
                      y1={yTarget}
                      y2={yTarget}
                      stroke="currentColor"
                      strokeWidth={1.1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                      className="text-primary/45"
                    />
                  ) : null}
                  {hasLine ? (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      className="text-teal-700/85 dark:text-teal-400/80"
                    />
                  ) : null}
                  {pts.map((p) => (
                    <circle
                      key={p.date}
                      cx={p.x}
                      cy={p.y}
                      r={2}
                      fill="currentColor"
                      className="text-teal-700 dark:text-teal-400"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              </svg>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center px-1 text-center text-muted-foreground",
                "text-[9px]"
              )}
            >
              기록이 쌓이면 최근 {CHART_POINTS}건 추이가 표시됩니다
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 px-0.5">
        <div className="flex gap-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="pl-0.5 text-[9px] font-medium text-muted-foreground">
              날짜{" "}
              <span className="font-normal text-muted-foreground/80">
                (월·일)
              </span>
            </span>
            <DigitalWheelColumn
              values={dateOptions}
              selected={pickDate}
              onSelect={setPickDate}
              formatDisplay={(ymd) => formatKoreanDay(ymd)}
              tone="date"
              ariaLabel="기록 날짜"
              className="min-w-0"
            />
          </div>
          <div className="flex min-w-0 flex-[1.35] flex-col gap-0.5">
            <span className="pl-0.5 text-[9px] font-medium text-muted-foreground">
              체중{" "}
              <span className="font-normal text-muted-foreground/80">(kg)</span>
            </span>
            <div className="flex gap-1">
              <DigitalWheelColumn
                values={KG_INTS}
                selected={kgInt}
                onSelect={setKgInt}
                tone="weight"
                ariaLabel="체중 정수 kg"
                className="min-w-0 flex-1"
              />
              <div className="flex w-4 shrink-0 flex-col items-center justify-end pb-2">
                <span className="font-data text-sm font-semibold text-muted-foreground">
                  .
                </span>
              </div>
              <DigitalWheelColumn
                values={KG_DECS}
                selected={kgDec}
                onSelect={setKgDec}
                tone="weight"
                ariaLabel="체중 소수 첫째 자리"
                className="w-12 shrink-0"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={saving || !kgValid}
        onClick={handleSave}
        className={cn(
          "mt-2 w-full shrink-0 rounded-xl py-2 text-[11px] font-semibold transition-colors active:scale-[0.99]",
          "border border-teal-800/25 bg-teal-700/90 text-white",
          "hover:bg-teal-700 dark:border-teal-400/20 dark:bg-teal-800/90 dark:hover:bg-teal-700/95",
          "disabled:pointer-events-none disabled:opacity-45"
        )}
      >
        {saving ? "저장 중…" : "측정 저장"}
      </button>

      <CoachFootnote>
        정확한 측정이 결과를 만듭니다. 같은 조건·같은 시간대를 유지하십시오.
      </CoachFootnote>
    </section>
  );
}
