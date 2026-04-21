"use client";

/**
 * CalorieGauge — P0 리팩터 (Design Review v1)
 * ─────────────────────────────────────────────
 * 이전: 8개 지표가 한 카드에 겹쳐져 시선 분산
 *   · 상태 배지 · 3링 게이지 · 중앙 kcal · 좌우 매크로 ·
 *     프로그레스 바 · zone 메시지 · 달성률/남은 kcal 듀얼 · 코치 메시지
 * 이후: 3지표 + 1코치 원칙
 *   · 중앙 kcal (HERO)  · 매크로 3개 (수평 라인, 게이지 하단) · 코치 한 줄
 *   · "프로그레스 바 + 달성률/남은 kcal 듀얼 지표"는 중앙 숫자 밑 1줄로 합침
 *   · "live signal" 은 expandable details 뒤로 이동 (aria-controls + summary)
 *
 * 접근성 수정 (P0-2)
 *   · fat 링 stroke = var(--chart-3) → color-mix 85% + 추가 1.4x saturation
 *   · muted-foreground 10px 라벨을 11px + text-foreground/70 으로 승급 (AA small text ≥ 4.5:1)
 *   · zone 메시지에서 이모지 제거 + 위치 톤 유지
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, animate as fmAnimate } from "framer-motion";
import { Circle, TriangleAlert, ChevronDown } from "lucide-react";
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

/* ───────── zone readout (카피 P0-3 수정: 이모지 제거, Watcher 톤 통일) ───── */
function statusReadout(zone: CalorieZone): { line: string; badgeClass: string } {
  switch (zone) {
    case "empty":
      return {
        line: "시스템 대기",
        badgeClass:
          "border-muted-foreground/40 bg-background/60 text-foreground/75 shadow-none",
      };
    case "safe":
      return {
        line: "시스템 정상",
        badgeClass:
          "border-chart-2/55 bg-chart-2/12 text-chart-2 shadow-[0_0_12px_color-mix(in_srgb,var(--chart-2)_40%,transparent)] dark:border-chart-2/45 dark:bg-chart-2/14",
      };
    case "caution":
      return {
        line: "과부하 주의",
        badgeClass:
          "border-chart-3/60 bg-chart-3/14 text-chart-3 shadow-[0_0_14px_color-mix(in_srgb,var(--chart-3)_40%,transparent)] dark:border-chart-3/50 dark:bg-chart-3/16",
      };
    case "danger":
      return {
        line: "심각 · 한도 초과",
        badgeClass:
          "border-gauge-danger/65 bg-gauge-danger/16 text-gauge-danger shadow-[0_0_16px_color-mix(in_srgb,var(--gauge-danger)_50%,transparent)] dark:border-gauge-danger/55 dark:bg-gauge-danger/18",
      };
  }
}

function zoneMessage(zone: CalorieZone): string {
  // P0-3 카피 재작성: Watcher 톤 (냉철 · 정교)
  switch (zone) {
    case "empty":    return "대기 중. 첫 끼니를 기록하세요.";
    case "safe":     return "정상 범위. 현재 페이스를 유지하세요.";
    case "caution":  return "목표 근접. 잔여 구간 주의.";
    case "danger":   return "한도 초과. 내일 세션을 가볍게 구성하세요.";
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
        transparent 45%)
    `;
  }
  switch (zone) {
    case "empty":
      return `radial-gradient(ellipse 100% 80% at 50% -10%, color-mix(in srgb, var(--muted-foreground) 8%, transparent) 0%, transparent 55%)`;
    case "safe":
      return `
        radial-gradient(ellipse 110% 85% at 50% 0%, color-mix(in srgb, var(--chart-2) 12%, transparent) 0%, transparent 50%),
        radial-gradient(ellipse 100% 80% at 0% 100%, color-mix(in srgb, var(--chart-1) 8%, transparent) 0%, transparent 52%)
      `;
    case "caution":
      return `radial-gradient(ellipse 100% 75% at 50% 0%, color-mix(in srgb, var(--chart-3) 14%, transparent) 0%, transparent 48%)`;
    case "danger":
      return `radial-gradient(ellipse 100% 80% at 50% 110%, color-mix(in srgb, var(--gauge-danger) 18%, transparent) 0%, transparent 50%)`;
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

/* ───────── 수평 매크로 라인 (신규): 3개를 한 줄로 ───── */
function MacroRow({
  macros,
  targets,
  compact,
}: {
  macros: MacroTotals;
  targets: MacroTotals;
  compact: boolean;
}) {
  const rows = [
    { label: "탄", cur: macros.carbsG,    tgt: targets.carbsG,    color: "var(--chart-1)" },
    { label: "단", cur: macros.proteinG,  tgt: targets.proteinG,  color: "var(--chart-2)" },
    { label: "지", cur: macros.fatG,      tgt: targets.fatG,      color: "var(--chart-3)" },
  ];
  return (
    <div
      className={cn(
        "mt-4 grid w-full grid-cols-3 gap-1.5",
        compact ? "max-w-[17rem]" : "max-w-[22rem]"
      )}
      role="list"
      aria-label="탄·단·지 달성률"
    >
      {rows.map((m) => {
        const cur = Math.round(m.cur);
        const tgt = Math.round(m.tgt);
        const pct = tgt > 0.001 ? Math.min(cur / tgt, 1) : 0;
        const over = tgt > 0.001 && cur > tgt;
        return (
          <div
            key={m.label}
            role="listitem"
            aria-label={`${m.label} ${cur} 대 ${tgt} 그램, ${Math.round(pct * 100)}% 달성`}
            className="flex min-w-0 flex-col gap-1"
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="text-[11px] font-semibold text-foreground/75">
                {m.label}
              </span>
              <p
                className={cn(
                  "font-data text-[11px] leading-none tracking-tight",
                  over ? "font-bold" : "font-semibold"
                )}
                style={{ color: m.color }}
              >
                {cur}
                <span className="mx-0.5 text-foreground/50">/</span>
                <span className="text-foreground/65">{tgt}</span>
                <span className="ml-0.5 text-[9px] text-foreground/55">g</span>
              </p>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted/70 dark:bg-muted/40"
              aria-hidden
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct * 100}%`,
                  background: m.color,
                  boxShadow: `0 0 6px color-mix(in srgb, ${m.color} 40%, transparent)`,
                }}
              />
            </div>
          </div>
        );
      })}
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
  const remaining = Math.max(target - current, 0);

  const macroTotals: MacroTotals = macros ?? { carbsG: 0, proteinG: 0, fatG: 0 };
  const macroTargets = useMemo(
    () => macroGramTargetsFromCalorieTarget(target),
    [target]
  );
  const macroR = useMemo(
    () => macroRatiosOpen(macroTotals, macroTargets),
    [macroTotals, macroTargets]
  );

  const fatHeavy = !isEmpty && isFatHeavy(macroTotals) && current > 0;
  const fatMist = fatHeavy || isDangerCal;

  const nextAction = buildDashboardNextAction(zone, current, target, macros);
  const liveSignal = buildLiveSignalLine(zone, current, mealCount, macros);

  /* 단일 링 (칼로리) — 3링에서 1링으로 단순화.
     매크로는 아래 MacroRow 에서 수평 라인으로 분리. */
  const vbW = compact ? 220 : 260;
  const vbH = compact ? 120 : 130;
  const cx = vbW / 2;
  const cy = compact ? 100 : 108;
  const stroke = compact ? 9 : 12;
  const r = compact ? 86 : 104;

  const arc = describeArc(cx, cy, r, Math.PI, 0);
  const arcLen = Math.PI * r;
  const offset = isEmpty ? arcLen : arcLen - Math.min(clampedCalPct / 100, 1) * arcLen;

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
      role="group"
      aria-label={`오늘 섭취 칼로리 ${current} 대 목표 ${target} kcal, ${readout.line}`}
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
        {/* 1) 상태 배지 (최소 배경) */}
        {!compact ? (
          <div className="mb-3 flex w-full justify-center">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-data text-[11px] font-bold tracking-wide",
                readout.badgeClass
              )}
            >
              <Circle className="h-2 w-2 shrink-0 fill-current" strokeWidth={0} aria-hidden />
              <span>{readout.line}</span>
            </span>
          </div>
        ) : null}

        {/* 2) HERO: 칼로리 단일 링 + 중앙 큰 숫자 */}
        <div className="relative flex w-full justify-center">
          <svg
            width="100%"
            height={compact ? 92 : 112}
            viewBox={`0 0 ${vbW} ${vbH}`}
            className={cn("mx-auto block shrink-0 overflow-visible", compact ? "max-w-[14rem]" : "max-w-[18rem]")}
            aria-hidden
          >
            <path
              d={arc}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{ stroke: "color-mix(in srgb, var(--border) 60%, transparent)" }}
            />
            <motion.path
              d={arc}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={arcLen}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ type: "spring", stiffness: 88, damping: 16, mass: 0.82 }}
              className={cn(isDangerCal && "gauge-ring-burn-motion")}
              style={{
                stroke: isDangerCal
                  ? "color-mix(in srgb, var(--gauge-danger) 92%, white 8%)"
                  : "url(#kcalGrad)",
                filter: isDangerCal
                  ? undefined
                  : "drop-shadow(0 0 10px color-mix(in srgb, var(--chart-2) 55%, transparent))",
              }}
            />
            <defs>
              <linearGradient id="kcalGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"  stopColor="var(--chart-1)" />
                <stop offset="50%" stopColor="var(--chart-2)" />
                <stop offset="100%" stopColor="var(--chart-3)" />
              </linearGradient>
            </defs>
          </svg>

          {/* 중앙 숫자 — 링 안쪽 절대배치 */}
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 flex flex-col items-center gap-0.5",
              compact ? "top-8" : "top-10"
            )}
          >
            <motion.p
              className={cn(
                "font-data font-bold tabular-nums tracking-tight leading-none",
                compact ? "text-3xl" : "text-[2.6rem] sm:text-[2.9rem]",
                isEmpty ? "text-foreground/85" : isDangerCal ? "text-gauge-danger" : "text-foreground"
              )}
              style={{
                textShadow: isDangerCal
                  ? "0 0 20px color-mix(in srgb, var(--gauge-danger) 30%, transparent)"
                  : "0 0 16px color-mix(in srgb, var(--foreground) 10%, transparent)",
              }}
            >
              {displayKcal.toLocaleString()}
            </motion.p>
            <p className="font-data text-[11px] leading-none text-foreground/65">
              / {target.toLocaleString()}{" "}
              <span className="font-semibold">kcal</span>
            </p>
          </div>
        </div>

        {/* 3) 통합 progress + 달성률/남은 kcal (기존 3블록 → 1줄) */}
        <div className="mt-3 w-full max-w-[20rem]">
          <div className={cn(
            "relative h-2.5 w-full overflow-hidden rounded-full border border-border/50 bg-muted/45 dark:border-white/10 dark:bg-muted/30"
          )}>
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-chart-1 via-chart-2 to-chart-3"
              initial={false}
              animate={{ width: `${isEmpty ? 0 : clampedCalPct}%` }}
              transition={{ type: "spring", stiffness: 110, damping: 18 }}
              style={{ boxShadow: "0 0 12px color-mix(in srgb, var(--chart-2) 40%, transparent)" }}
            />
            {!isEmpty ? <div className="gauge-energy-scan-line" /> : null}
          </div>
          {current > 0 ? (
            <p className="mt-1.5 flex items-baseline justify-between font-data text-[11px] tabular-nums text-foreground/70">
              <span>
                달성 <span className="font-bold text-foreground">{Math.round(percentage)}%</span>
              </span>
              <span>
                남음 <span className="font-bold text-foreground">{remaining.toLocaleString()}</span> kcal
              </span>
            </p>
          ) : null}
        </div>

        {/* 4) 매크로 — 수평 라인 3개 */}
        {target > 0 ? (
          <MacroRow macros={macroTotals} targets={macroTargets} compact={compact} />
        ) : null}

        {/* 5) 코치 한 줄 + zone 메시지 (통합 카드) */}
        {!compact ? (
          <div
            className={cn(
              "relative mt-4 w-full rounded-2xl border px-3 py-2.5",
              fatHeavy
                ? "border-amber-500/40 bg-amber-500/8 shadow-[0_0_20px_color-mix(in_srgb,var(--gauge-danger)_18%,transparent)] dark:border-amber-400/30 dark:bg-amber-500/10"
                : "border-border/60 bg-white/30 dark:border-white/[0.08] dark:bg-white/[0.04]"
            )}
          >
            <p
              className={cn(
                "flex items-start gap-1.5 text-[12px] font-semibold leading-snug",
                fatHeavy ? "text-amber-800 dark:text-amber-300" : "text-foreground"
              )}
            >
              {fatHeavy ? (
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" strokeWidth={2.25} aria-hidden />
              ) : null}
              <span>{nextAction}</span>
            </p>
            <p
              key={zone}
              className={cn(
                "mt-1 text-[11px] leading-snug text-foreground/65",
                isDangerCal && "text-gauge-danger/85 font-medium"
              )}
            >
              {zoneMessage(zone)}
            </p>
          </div>
        ) : null}

        {/* 6) Live signal — 접힌 상태, 필요한 사람만 확장 */}
        {!compact && current > 0 ? (
          <details className="group mt-2 w-full">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-[10px] font-medium text-foreground/55 hover:text-foreground/80">
              <span>시스템 로그</span>
              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-1.5 w-full text-center font-data text-[10px] leading-relaxed text-foreground/65 tabular-nums">
              {liveSignal}
            </p>
          </details>
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
