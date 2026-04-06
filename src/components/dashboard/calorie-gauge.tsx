"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, animate as fmAnimate } from "framer-motion";
import { Circle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCalorieZone, type CalorieZone } from "@/lib/calorie-zone";
import type { MacroTotals } from "@/lib/meal-macros";
import { isFatHeavy } from "@/lib/meal-macros";
import { macroGramTargetsFromCalorieTarget } from "@/lib/macro-targets";
import {
  buildDashboardNextAction,
  buildLiveSignalLine,
} from "@/lib/dashboard-coach";

interface CalorieGaugeProps {
  current: number;
  target: number;
  macros?: MacroTotals | null;
  compact?: boolean;
  mealCount?: number;
}

function statusReadout(zone: CalorieZone): { line: string; badgeClass: string } {
  switch (zone) {
    case "empty":
      return {
        line: "시스템 대기",
        badgeClass:
          "border-muted-foreground/35 bg-background/55 text-muted-foreground shadow-none",
      };
    case "safe":
      return {
        line: "시스템 정상",
        badgeClass:
          "border-chart-2/45 bg-chart-2/10 text-chart-2 shadow-[0_0_12px_color-mix(in_srgb,var(--chart-2)_40%,transparent)] dark:border-chart-2/40 dark:bg-chart-2/12",
      };
    case "caution":
      return {
        line: "과부하 주의",
        badgeClass:
          "border-chart-3/50 bg-chart-3/12 text-chart-3 shadow-[0_0_14px_color-mix(in_srgb,var(--chart-3)_35%,transparent)] dark:border-chart-3/45 dark:bg-chart-3/14",
      };
    case "danger":
      return {
        line: "심각 · 한도 초과",
        badgeClass:
          "border-gauge-danger/55 bg-gauge-danger/14 text-gauge-danger shadow-[0_0_16px_color-mix(in_srgb,var(--gauge-danger)_45%,transparent)] dark:border-gauge-danger/50 dark:bg-gauge-danger/16",
      };
  }
}

function zoneBackdrop(zone: CalorieZone, fatMist: boolean): string {
  if (fatMist) {
    return `
      radial-gradient(ellipse 120% 80% at 50% 100%,
        color-mix(in srgb, var(--gauge-danger) 14%, transparent) 0%,
        transparent 52%),
      radial-gradient(ellipse 90% 60% at 50% 0%,
        color-mix(in srgb, var(--chart-1) 10%, transparent) 0%,
        transparent 45%),
      radial-gradient(ellipse 80% 70% at 80% 40%,
        color-mix(in srgb, var(--chart-3) 8%, transparent) 0%,
        transparent 55%)
    `;
  }
  switch (zone) {
    case "empty":
      return `
        radial-gradient(ellipse 100% 80% at 50% -10%,
          color-mix(in srgb, var(--muted-foreground) 8%, transparent) 0%,
          transparent 55%),
        radial-gradient(ellipse 90% 70% at 100% 100%,
          color-mix(in srgb, var(--primary) 6%, transparent) 0%,
          transparent 50%)
      `;
    case "safe":
      return `
        radial-gradient(ellipse 110% 85% at 50% 0%,
          color-mix(in srgb, var(--chart-2) 12%, transparent) 0%,
          transparent 50%),
        radial-gradient(ellipse 100% 80% at 0% 100%,
          color-mix(in srgb, var(--chart-1) 8%, transparent) 0%,
          transparent 52%)
      `;
    case "caution":
      return `
        radial-gradient(ellipse 100% 75% at 50% 0%,
          color-mix(in srgb, var(--chart-3) 14%, transparent) 0%,
          transparent 48%),
        radial-gradient(ellipse 85% 70% at 100% 90%,
          color-mix(in srgb, var(--gauge-caution) 10%, transparent) 0%,
          transparent 50%)
      `;
    case "danger":
      return `
        radial-gradient(ellipse 100% 80% at 50% 110%,
          color-mix(in srgb, var(--gauge-danger) 18%, transparent) 0%,
          transparent 50%),
        radial-gradient(ellipse 90% 60% at 10% 0%,
          color-mix(in srgb, var(--gauge-danger) 8%, transparent) 0%,
          transparent 55%)
      `;
  }
}

function macroRatiosOpen(
  current: MacroTotals,
  target: MacroTotals
): { carb: number; protein: number; fat: number } {
  const r = (c: number, t: number) => (t > 0.001 ? c / t : 0);
  return {
    carb: r(current.carbsG, target.carbsG),
    protein: r(current.proteinG, target.proteinG),
    fat: r(current.fatG, target.fatG),
  };
}

function MacroGramReadout({
  label,
  short,
  currentG,
  targetG,
  over,
  accentClass,
  align,
  compact,
}: {
  label: string;
  short: string;
  currentG: number;
  targetG: number;
  over: boolean;
  accentClass: string;
  align: "left" | "right";
  compact: boolean;
}) {
  const cur = Math.round(currentG);
  const tgt = Math.round(targetG);
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "right" ? "items-end text-right" : "items-start text-left",
        compact ? "min-w-[3.25rem]" : "min-w-[4rem]"
      )}
      title={label}
    >
      <span
        className={cn(
          "font-data text-[9px] font-bold uppercase tracking-wide text-muted-foreground",
          compact && "text-[8px]"
        )}
      >
        {short}
      </span>
      <p
        className={cn(
          "font-data tabular-nums leading-tight",
          compact ? "text-[10px]" : "text-[11px]",
          over ? "font-bold text-gauge-danger" : `font-semibold ${accentClass}`
        )}
      >
        {cur}
        <span className="mx-0.5 text-muted-foreground/80">/</span>
        {tgt}
        <span className="ml-0.5 text-[0.85em] text-muted-foreground">g</span>
      </p>
    </div>
  );
}

export function CalorieGauge({
  current,
  target,
  macros = null,
  compact = false,
  mealCount = 0,
}: CalorieGaugeProps) {
  const [displayKcal, setDisplayKcal] = useState(current);
  const kcalAnimRef = useRef(current);

  useEffect(() => {
    const from = kcalAnimRef.current;
    const c = fmAnimate(from, current, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplayKcal(Math.round(v)),
    });
    kcalAnimRef.current = current;
    return () => c.stop();
  }, [current]);

  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedCalPct = Math.min(percentage, 100);
  const zone = getCalorieZone(current, target);
  const readout = statusReadout(zone);
  const isDangerCal = zone === "danger";
  const isEmpty = zone === "empty";

  const macroTotals: MacroTotals = macros ?? {
    carbsG: 0,
    proteinG: 0,
    fatG: 0,
  };
  const macroTargets = useMemo(
    () => macroGramTargetsFromCalorieTarget(target),
    [target]
  );
  const macroR = useMemo(
    () => macroRatiosOpen(macroTotals, macroTargets),
    [macroTotals, macroTargets]
  );

  const fatHeavy = !isEmpty && isFatHeavy(macroTotals) && current > 0;
  const fatMist =
    fatHeavy ||
    macroR.fat > 1 ||
    macroR.carb > 1 ||
    macroR.protein > 1 ||
    isDangerCal;

  const nextAction = buildDashboardNextAction(
    zone,
    current,
    target,
    macros
  );
  const liveSignal = buildLiveSignalLine(
    zone,
    current,
    mealCount,
    macros
  );

  /** 넉넉한 반경·간격(불 이펙트·가독성) */
  const vbW = compact ? 220 : 290;
  const vbH = compact ? 128 : 148;
  const cx = vbW / 2;
  const cy = compact ? 112 : 122;
  const stroke = compact ? 5.5 : 7;
  const ringGap = compact ? 10 : 14;
  const ringStep = stroke + ringGap;
  const rFat = compact ? 78 : 102;
  const rProtein = rFat - ringStep;
  const rCarb = rProtein - ringStep;

  const ringMeta = [
    {
      key: "carb",
      r: rCarb,
      ratio: macroR.carb,
      stop: "color-mix(in srgb, var(--chart-1) 88%, white 12%)",
      glow:
        "drop-shadow(0 0 6px color-mix(in srgb, var(--chart-1) 48%, transparent))",
    },
    {
      key: "protein",
      r: rProtein,
      ratio: macroR.protein,
      stop: "color-mix(in srgb, var(--chart-2) 88%, white 10%)",
      glow:
        "drop-shadow(0 0 7px color-mix(in srgb, var(--chart-2) 52%, transparent))",
    },
    {
      key: "fat",
      r: rFat,
      ratio: macroR.fat,
      stop: "color-mix(in srgb, var(--chart-3) 85%, white 8%)",
      glow:
        "drop-shadow(0 0 7px color-mix(in srgb, var(--chart-3) 50%, transparent))",
    },
  ] as const;

  const startAngle = Math.PI;
  const endAngle = 0;

  const showMacroSides = target > 0;

  return (
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border transition-[box-shadow,background-color] duration-500 sm:rounded-[28px]",
        "backdrop-blur-[12px]",
        "bg-white/55 shadow-lg dark:bg-white/[0.07] dark:shadow-black/25",
        "border-black/[0.06] dark:border-white/[0.1]",
        compact ? "p-4" : "p-6"
      )}
      style={{
        backgroundImage: `${zoneBackdrop(zone, fatMist)}, color-mix(in srgb, var(--card) 88%, transparent)`,
      }}
    >
      {fatMist ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-90 dark:opacity-100"
          style={{
            background: `radial-gradient(ellipse 95% 65% at 50% 105%, color-mix(in srgb, var(--gauge-danger) 22%, transparent) 0%, transparent 58%)`,
            boxShadow:
              "inset 0 0 40px color-mix(in srgb, var(--gauge-danger) 8%, transparent)",
          }}
          aria-hidden
        />
      ) : null}

      <div className="relative z-[1] flex flex-col items-center">
        {!compact ? (
          <div className="mb-4 flex w-full justify-center">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-data text-[11px] font-bold tracking-wide",
                readout.badgeClass
              )}
            >
              <Circle
                className="h-2 w-2 shrink-0 fill-current text-current"
                strokeWidth={0}
                aria-hidden
              />
              <span>{readout.line}</span>
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex w-full items-start justify-center",
            showMacroSides ? "gap-1 sm:gap-2" : "justify-center",
            compact ? "max-w-[19rem]" : "max-w-[24rem]"
          )}
        >
          {showMacroSides ? (
            <div
              className={cn(
                "flex shrink-0 flex-col justify-center gap-3 pt-6 sm:pt-8",
                compact ? "gap-2 pt-4" : "gap-3.5"
              )}
            >
              <MacroGramReadout
                label="탄수화물"
                short="탄"
                currentG={macroTotals.carbsG}
                targetG={macroTargets.carbsG}
                over={macroR.carb > 1}
                accentClass="text-chart-1"
                align="right"
                compact={compact}
              />
              <MacroGramReadout
                label="단백질"
                short="단"
                currentG={macroTotals.proteinG}
                targetG={macroTargets.proteinG}
                over={macroR.protein > 1}
                accentClass="text-chart-2"
                align="right"
                compact={compact}
              />
            </div>
          ) : null}

          <div className="relative min-w-0 flex-1 px-0.5">
            <svg
              width="100%"
              height={compact ? 118 : 138}
              viewBox={`0 0 ${vbW} ${vbH}`}
              className="mx-auto block overflow-visible"
              aria-hidden
            >
              {ringMeta.map(({ key, r, ratio, stop, glow }) => {
                const arc = describeArc(cx, cy, r, startAngle, endAngle);
                const arcLen = Math.PI * r;
                const fillPortion = Math.min(Math.max(ratio, 0), 1);
                const offset = arcLen - fillPortion * arcLen;
                const over = ratio > 1;
                const dangerStroke = "var(--gauge-danger)";
                const strokeColor = over ? dangerStroke : stop;
                return (
                  <g key={key}>
                    <path
                      d={arc}
                      fill="none"
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      className="transition-colors duration-300"
                      style={{
                        stroke:
                          "color-mix(in srgb, var(--border) 55%, transparent)",
                      }}
                    />
                    <motion.path
                      d={arc}
                      fill="none"
                      strokeWidth={stroke}
                      strokeLinecap="round"
                      strokeDasharray={arcLen}
                      initial={false}
                      animate={{
                        strokeDashoffset: isEmpty ? arcLen : offset,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 88,
                        damping: 16,
                        mass: 0.82,
                      }}
                      className={cn(over && "gauge-ring-burn-motion")}
                      style={{
                        stroke: strokeColor,
                        ...(over
                          ? {}
                          : { filter: glow }),
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end",
                compact ? "pb-0" : "pb-1"
              )}
            >
              <Circle
                className={cn(
                  "mb-1 shrink-0 stroke-2 text-chart-2/80 dark:text-chart-2",
                  compact ? "h-2.5 w-2.5" : "h-3 w-3",
                  isEmpty && "text-muted-foreground"
                )}
                fill="none"
                aria-hidden
              />
              <motion.p
                className={cn(
                  "font-data font-bold tabular-nums tracking-tight",
                  compact ? "text-2xl" : "text-[2.05rem] sm:text-4xl",
                  isEmpty
                    ? "text-foreground/85"
                    : isDangerCal
                      ? "text-gauge-danger"
                      : "text-foreground"
                )}
                style={{
                  textShadow: isEmpty
                    ? undefined
                    : "0 0 24px color-mix(in srgb, var(--foreground) 12%, transparent)",
                }}
              >
                {displayKcal.toLocaleString()}
              </motion.p>
              <p
                className={cn(
                  "font-data text-muted-foreground",
                  compact ? "text-[10px]" : "text-xs"
                )}
              >
                / {target.toLocaleString()}{" "}
                <span className="text-[0.92em] font-semibold">kcal</span>
              </p>
              {compact && current > 0 ? (
                <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                  달성 {Math.round(percentage)}% · 남은{" "}
                  {Math.max(target - current, 0).toLocaleString()}kcal
                </p>
              ) : null}
            </div>
          </div>

          {showMacroSides ? (
            <div
              className={cn(
                "flex shrink-0 flex-col justify-center gap-3 pt-6 sm:pt-8",
                compact ? "gap-2 pt-4" : "gap-3.5"
              )}
            >
              <MacroGramReadout
                label="지방"
                short="지"
                currentG={macroTotals.fatG}
                targetG={macroTargets.fatG}
                over={macroR.fat > 1}
                accentClass="text-chart-3"
                align="left"
                compact={compact}
              />
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "relative mt-5 w-full overflow-hidden rounded-full border border-border/50 bg-muted/45 dark:border-white/10 dark:bg-muted/30",
            compact ? "mt-4 h-2" : "h-3.5 sm:h-4"
          )}
        >
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3"
            initial={false}
            animate={{
              width: `${isEmpty ? 0 : clampedCalPct}%`,
            }}
            transition={{
              type: "spring",
              stiffness: 110,
              damping: 18,
            }}
            style={{
              boxShadow:
                "0 0 14px color-mix(in srgb, var(--chart-2) 38%, transparent)",
            }}
          />
          {!isEmpty ? <div className="gauge-energy-scan-line" /> : null}
        </div>
        {!compact && current > 0 ? (
          <p className="mt-2 font-data text-[10px] tabular-nums text-muted-foreground">
            일일 에너지 소진{" "}
            <span className="font-semibold text-foreground">
              {Math.round(percentage)}%
            </span>
          </p>
        ) : null}

        {!compact ? (
          <motion.p
            className={cn(
              "mt-3 text-center text-xs font-medium text-muted-foreground",
              isEmpty && "text-foreground/80"
            )}
            key={zone}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            {zone === "empty"
              ? "오늘의 식단을 기록해보세요!"
              : zone === "safe"
                ? "좋아요! 여유 있어요 🙂"
                : zone === "caution"
                  ? "목표에 거의 도달했어요. 조금만 조절해요 👀"
                  : "목표를 넘겼어요! 내일은 가볍게 가볼까요 🔥"}
          </motion.p>
        ) : null}

        {!compact && current > 0 ? (
          <div className="mt-3 flex gap-6 font-data text-xs text-muted-foreground">
            <div className="text-center">
              <p
                className={cn(
                  "text-base font-bold tabular-nums text-foreground",
                  isDangerCal && "text-gauge-danger"
                )}
              >
                {Math.round(percentage)}%
              </p>
              <p className="text-[10px] font-medium">달성률</p>
            </div>
            <div className="w-px bg-border/80" />
            <div className="text-center">
              <p className="text-base font-bold tabular-nums text-foreground">
                {Math.max(target - current, 0).toLocaleString()}
              </p>
              <p className="text-[10px] font-medium">남은 kcal</p>
            </div>
          </div>
        ) : null}

        {!compact ? (
          <>
            <div
              className={cn(
                "relative mt-4 w-full rounded-2xl border px-3 py-2.5 text-center",
                fatHeavy
                  ? "border-amber-500/35 bg-amber-500/5 shadow-[0_0_20px_color-mix(in_srgb,var(--gauge-danger)_18%,transparent)] dark:border-amber-400/30 dark:bg-amber-500/10"
                  : "border-border/60 bg-white/25 dark:border-white/[0.08] dark:bg-white/[0.04]"
              )}
            >
              {fatHeavy ? (
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-80"
                  style={{
                    boxShadow:
                      "inset 0 0 22px color-mix(in srgb, var(--gauge-danger) 12%, transparent)",
                  }}
                  aria-hidden
                />
              ) : null}
              <p
                className={cn(
                  "relative z-[1] flex items-start justify-center gap-1.5 text-[11px] font-semibold leading-snug",
                  fatHeavy
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-foreground"
                )}
                style={
                  fatHeavy
                    ? {
                        textShadow:
                          "0 0 12px color-mix(in srgb, var(--chart-3) 45%, transparent)",
                      }
                    : undefined
                }
              >
                {fatHeavy ? (
                  <TriangleAlert
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                ) : null}
                <span>{nextAction}</span>
              </p>
            </div>
            <p className="mt-2 w-full text-center text-[10px] leading-relaxed text-muted-foreground">
              {liveSignal}
            </p>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy - radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy - radius * Math.sin(endAngle);
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
}
