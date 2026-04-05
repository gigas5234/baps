"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { Scale } from "lucide-react";
import { DigitalWheelColumn } from "@/components/dashboard/digital-wheel-column";
import {
  getChartWeightEntries,
  loadWeightEntries,
  upsertWeightEntry,
  WEIGHT_STORAGE_KEY,
} from "@/lib/weight-local-storage";
import {
  layoutWeightChart,
  type ChartPoint,
} from "@/lib/weight-chart-geometry";
import { useUpsertWeightLog, useWeightLogs } from "@/lib/queries";
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

/** 휠·LCD 공통: 짧은 숫자만 (MM.DD) */
function formatCompactMday(ymd: string): string {
  if (ymd.length >= 10) {
    return `${ymd.slice(5, 7)}.${ymd.slice(8, 10)}`;
  }
  return ymd;
}

const KG_INTS = Array.from({ length: KG_INT_MAX - KG_INT_MIN + 1 }, (_, i) =>
  String(KG_INT_MIN + i)
);
const KG_DECS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** 날짜·체중 휠 뷰포트 높이 통일 */
const WHEEL_VIEWPORT_PX = 108;

/** LCD 직접 입력: 소수 첫째 자리까지, 휠과 동일 한 자리 */
function filterKgDraftInput(raw: string): string {
  let v = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDot = v.indexOf(".");
  if (firstDot !== -1) {
    v =
      v.slice(0, firstDot + 1) +
      v
        .slice(firstDot + 1)
        .replace(/\./g, "")
        .slice(0, 1);
  }
  return v;
}

function parseKgDraftToParts(
  draft: string
): { flo: number; dec: number } | null {
  const t = draft.trim().replace(",", ".");
  if (t === "" || t === ".") return null;
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(
    KG_INT_MAX + 0.9,
    Math.max(KG_INT_MIN, Math.round(n * 10) / 10)
  );
  const flo = Math.floor(clamped);
  const dec = Math.min(9, Math.max(0, Math.round((clamped - flo) * 10)));
  return { flo, dec };
}

interface WeightSparkStripProps {
  userId: string | undefined;
  selectedDate: string;
  profileKg: number | null | undefined;
  targetWeightKg: number | null | undefined;
  onSavedProfile?: () => void;
  /** 차트 점 선택 시 메인 캘린더 등과 같은 날짜로 맞춤 */
  onNavigateToDate?: (ymd: string) => void;
  compact?: boolean;
}

export function WeightSparkStrip({
  userId,
  selectedDate,
  profileKg,
  targetWeightKg,
  onSavedProfile,
  onNavigateToDate,
  compact = false,
}: WeightSparkStripProps) {
  const clipUid = useId().replace(/:/g, "");
  const dateOptions = useMemo(() => buildDateOptions(DATE_WHEEL_DAYS), []);
  const oldestDate = dateOptions[0] ?? getLocalYmd();
  const { data: remoteEntries = [] } = useWeightLogs(userId, oldestDate);
  const upsertWeightLog = useUpsertWeightLog(userId);

  const [entriesVersion, setEntriesVersion] = useState(0);

  const [pickDate, setPickDate] = useState(selectedDate);
  const [kgInt, setKgInt] = useState("70");
  const [kgDec, setKgDec] = useState("0");
  const [saving, setSaving] = useState(false);
  /** 차트 점 클릭으로 고른 포인트만 안내(휠로 날짜 바꾸면 해제) */
  const [chartTap, setChartTap] = useState<{
    date: string;
    kg: number;
  } | null>(null);

  const [lcdEditing, setLcdEditing] = useState(false);
  const [lcdDraft, setLcdDraft] = useState("");
  const lcdInputRef = useRef<HTMLInputElement>(null);
  const lcdPanelRef = useRef<HTMLDivElement>(null);
  const lcdSkipBlurApply = useRef(false);

  const bumpEntries = useCallback(() => {
    setEntriesVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (userId) return;
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
  }, [userId, bumpEntries]);

  useEffect(() => {
    if (dateOptions.includes(selectedDate)) {
      setPickDate(selectedDate);
    } else {
      setPickDate(getLocalYmd());
    }
  }, [selectedDate, dateOptions]);

  useEffect(() => {
    if (chartTap && chartTap.date !== pickDate) setChartTap(null);
  }, [pickDate, chartTap]);

  const handleChartPointPick = useCallback(
    (p: ChartPoint) => {
      setChartTap({ date: p.date, kg: p.kg });
      setPickDate(p.date);
      onNavigateToDate?.(p.date);
    },
    [onNavigateToDate]
  );

  const closeLcdEdit = useCallback(() => {
    setLcdEditing(false);
  }, []);

  const applyLcdDraft = useCallback(() => {
    const parts = parseKgDraftToParts(lcdDraft);
    if (parts) {
      setKgInt(String(parts.flo));
      setKgDec(String(parts.dec));
    }
    closeLcdEdit();
  }, [lcdDraft, closeLcdEdit]);

  const handleLcdBlur = useCallback(() => {
    if (lcdSkipBlurApply.current) {
      lcdSkipBlurApply.current = false;
      closeLcdEdit();
      return;
    }
    applyLcdDraft();
  }, [applyLcdDraft, closeLcdEdit]);

  const openLcdKeyboard = useCallback(() => {
    if (lcdEditing) return;
    const cur =
      Number.parseInt(kgInt, 10) + Number.parseInt(kgDec, 10) / 10;
    const ok =
      Number.isFinite(cur) &&
      cur >= KG_INT_MIN &&
      cur <= KG_INT_MAX + 0.9;
    setLcdDraft(ok ? cur.toFixed(1) : "70.0");
    setLcdEditing(true);
    window.setTimeout(() => {
      lcdPanelRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 50);
    requestAnimationFrame(() => {
      const el = lcdInputRef.current;
      if (!el) return;
      el.focus();
      el.select();
    });
  }, [kgInt, kgDec, lcdEditing]);

  /** 최근 기록 N개만 (7일 창이 아닌 “마지막 7포인트”) */
  const chartEntries = useMemo(() => {
    if (userId) {
      const sorted = [...remoteEntries].sort((a, b) =>
        a.date.localeCompare(b.date)
      );
      return sorted.length <= CHART_POINTS
        ? sorted
        : sorted.slice(-CHART_POINTS);
    }
    void entriesVersion;
    return getChartWeightEntries(CHART_POINTS);
  }, [userId, remoteEntries, entriesVersion]);

  const { pts, pathD, yTarget, minKg, maxKg } = layoutWeightChart(
    chartEntries,
    targetWeightKg
  );
  const hasLine = pathD.length > 0;
  const hasDots = pts.length > 0;

  const entryForPick = useMemo(() => {
    if (userId) {
      return remoteEntries.find((e) => e.date === pickDate);
    }
    return loadWeightEntries().find((e) => e.date === pickDate);
  }, [userId, remoteEntries, pickDate, entriesVersion]);

  useEffect(() => {
    const e = userId
      ? remoteEntries.find((x) => x.date === pickDate)
      : loadWeightEntries().find((x) => x.date === pickDate);
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
  }, [userId, remoteEntries, pickDate, profileKg, entriesVersion]);

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
        : `${formatCompactMday(pickDate)} 기록: ${entryForPick.kg.toFixed(1)} kg`
      : isToday
        ? "오늘은 아직 미기록"
        : `${formatCompactMday(pickDate)} · 기록 없음`;

  const handleSave = async () => {
    if (!kgValid) return;
    setSaving(true);
    try {
      const kg = Math.round(parsedKg * 10) / 10;
      if (userId) {
        await upsertWeightLog.mutateAsync({ date: pickDate, kg });
        onSavedProfile?.();
      } else {
        upsertWeightEntry(pickDate, kg);
        bumpEntries();
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
        <div className="flex items-start justify-between gap-1.5 px-0.5 pb-1.5">
          <div className="flex min-w-0 items-center gap-1.5 text-foreground">
            <Scale
              className="h-4 w-4 shrink-0 text-primary"
              strokeWidth={2}
              aria-hidden
            />
            <h3 className="text-sm font-semibold leading-tight tracking-tight">
              체중계
            </h3>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right text-[11px] leading-tight text-muted-foreground tabular-nums">
            <span>
              목표:{" "}
              {targetWeightKg != null && targetWeightKg > 0
                ? `${Number(targetWeightKg).toFixed(1)} kg`
                : "—"}
            </span>
            <span>
              프로필:{" "}
              {profileKg != null ? `${Number(profileKg).toFixed(1)} kg` : "—"}
            </span>
          </div>
        </div>

        <div
          ref={lcdPanelRef}
          className={cn(
            "relative overflow-hidden rounded-lg px-2 py-1.5 outline-none",
            "bg-zinc-900/88 dark:bg-zinc-950/90",
            "ring-1 ring-black/10 dark:ring-white/10",
            !lcdEditing &&
              "cursor-pointer transition-opacity active:opacity-90",
            lcdEditing && "ring-2 ring-teal-500/55 dark:ring-teal-400/45"
          )}
          aria-live="polite"
          role={lcdEditing ? undefined : "button"}
          tabIndex={lcdEditing ? -1 : 0}
          onClick={() => {
            if (!lcdEditing) openLcdKeyboard();
          }}
          onKeyDown={(e) => {
            if (lcdEditing) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openLcdKeyboard();
            }
          }}
          aria-label="체중 표시 탭하여 숫자 직접 입력"
        >
          <p className="relative pointer-events-none text-[10px] font-medium tracking-wide text-zinc-400">
            {lcdTop}
          </p>
          <div
            className={cn(
              "relative flex min-h-[2.25rem] items-baseline justify-center gap-0.5 py-0.5",
              "font-data tabular-nums text-zinc-50"
            )}
          >
            {lcdEditing ? (
              <>
                <input
                  type="text"
                  name="weight-lcd-direct"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="체중 직접 입력(소수 한 자리)"
                  ref={lcdInputRef}
                  value={lcdDraft}
                  onChange={(e) =>
                    setLcdDraft(filterKgDraftInput(e.target.value))
                  }
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLcdDraft();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      lcdSkipBlurApply.current = true;
                      lcdInputRef.current?.blur();
                    }
                  }}
                  onBlur={handleLcdBlur}
                  className={cn(
                    "min-w-0 flex-1 bg-transparent text-center text-xl font-semibold tracking-tight",
                    "text-zinc-50 placeholder:text-zinc-500",
                    "caret-teal-400 outline-none"
                  )}
                />
                <span className="pointer-events-none text-xs font-medium text-zinc-400">
                  kg
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    "pointer-events-none text-xl font-semibold tracking-tight",
                    !kgValid && "opacity-45"
                  )}
                >
                  {kgValid ? parsedKg.toFixed(1) : "--.-"}
                </span>
                <span className="pointer-events-none text-xs font-medium text-zinc-400">
                  kg
                </span>
              </>
            )}
          </div>
        </div>

        <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-muted-foreground">
          최근 기록 <span className="font-mono font-semibold">{CHART_POINTS}회</span>
          추이 · 목표선 점선
        </p>
        {chartTap ? (
          <div
            className={cn(
              "mt-1.5 rounded-lg border border-teal-600/30 bg-teal-500/10 px-2.5 py-2",
              "dark:border-teal-500/35 dark:bg-teal-500/10"
            )}
            role="status"
            aria-live="polite"
          >
            <p className="text-[11px] font-medium text-foreground">
              <span className="font-mono tabular-nums">
                {formatCompactMday(chartTap.date)}
              </span>
              <span className="mx-1 text-muted-foreground">·</span>
              <span className="font-data tabular-nums font-semibold">
                {chartTap.kg.toFixed(1)} kg
              </span>
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              아래 날짜·체중을 바꾼 뒤「측정 저장」하면 바로 반영됩니다.
            </p>
          </div>
        ) : null}

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
                className="h-full max-h-full w-full touch-manipulation"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                overflow="hidden"
                role="img"
                aria-label="체중 최근 기록 추이 · 점을 누르면 해당 날짜로 이동"
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
                  {pts.map((p) => {
                    const selectedDot = chartTap?.date === p.date;
                    return (
                      <g key={p.date}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={6}
                          fill="transparent"
                          className="cursor-pointer"
                          onClick={() => handleChartPointPick(p)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleChartPointPick(p);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${p.date}, ${p.kg.toFixed(1)}킬로그램, 탭하여 이 날짜로 이동`}
                        />
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={selectedDot ? 2.8 : 2}
                          fill="currentColor"
                          className={cn(
                            "text-teal-700 pointer-events-none dark:text-teal-400",
                            selectedDot &&
                              "text-teal-600 dark:text-teal-300"
                          )}
                          vectorEffect="non-scaling-stroke"
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            </div>
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center px-1 text-center text-muted-foreground",
                "text-[11px]"
              )}
            >
              기록이 쌓이면 최근 {CHART_POINTS}건 추이가 표시됩니다
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 px-0.5">
        <div className="flex items-stretch gap-1.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="pl-0.5 text-[11px] font-medium text-muted-foreground">
              날짜{" "}
              <span className="font-normal text-muted-foreground/85">(MM.DD)</span>
            </span>
            <DigitalWheelColumn
              values={dateOptions}
              selected={pickDate}
              onSelect={setPickDate}
              formatDisplay={(ymd) => formatCompactMday(ymd)}
              tone="date"
              heightPx={WHEEL_VIEWPORT_PX}
              ariaLabel="기록 날짜"
              className="min-w-0"
            />
          </div>
          <div className="flex min-w-0 flex-[1.35] flex-col gap-0.5">
            <span className="pl-0.5 text-[11px] font-medium text-muted-foreground">
              체중{" "}
              <span className="font-normal text-muted-foreground/85">(kg)</span>
            </span>
            <div
              className="flex min-h-0 items-stretch gap-1"
              style={{ minHeight: WHEEL_VIEWPORT_PX }}
            >
              <DigitalWheelColumn
                values={KG_INTS}
                selected={kgInt}
                onSelect={setKgInt}
                tone="weight"
                heightPx={WHEEL_VIEWPORT_PX}
                ariaLabel="체중 정수 kg"
                className="min-w-0 flex-1"
              />
              <div
                className="flex w-4 shrink-0 items-center justify-center self-stretch"
                style={{ minHeight: WHEEL_VIEWPORT_PX }}
              >
                <span className="font-data text-sm font-semibold text-muted-foreground">
                  .
                </span>
              </div>
              <DigitalWheelColumn
                values={KG_DECS}
                selected={kgDec}
                onSelect={setKgDec}
                tone="weight"
                heightPx={WHEEL_VIEWPORT_PX}
                ariaLabel="체중 소수 첫째 자리"
                className="w-12 shrink-0"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={saving || upsertWeightLog.isPending || !kgValid}
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
    </section>
  );
}
