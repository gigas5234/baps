"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { CalorieZone } from "@/lib/calorie-zone";
import type { MacroTotals } from "@/lib/meal-macros";
import { isFatHeavy, isProteinLow, macroKcalBreakdown } from "@/lib/meal-macros";
import { InsightRichText } from "@/components/dashboard/insight-rich-text";

const INSIGHT_BULLET_ICONS = ["🔍", "📊", "🔎", "📌"] as const;

/** 줄바꿈·문장 단위로 나눠 리포트 불릿에 사용 */
function splitInsightIntoSegments(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  const lines = t
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const sentences = t
    .split(/(?<=[.!?。！？])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 0 ? sentences : [t];
}

interface DailyQuipBannerProps {
  displayName: string;
  totalCal: number;
  target: number;
  mealCount: number;
  macros: MacroTotals;
  waterCups: number;
  cupMl: number;
  /** 프로필 기반 하루 권장 물(ml) */
  waterRecommendedMl: number;
  zone: CalorieZone;
  className?: string;
  /** 게이지와 붙일 때: 조밀한 카드 */
  compact?: boolean;
  /** Gemini 메인 인사이트(없으면 규칙 기반 fallback) */
  aiLine?: string | null;
  /** AI 요청 중 */
  aiPending?: boolean;
}

export function DailyQuipBanner({
  displayName,
  totalCal,
  target,
  mealCount,
  macros,
  waterCups,
  cupMl,
  waterRecommendedMl,
  zone,
  className,
  compact = false,
  aiLine = null,
  aiPending = false,
}: DailyQuipBannerProps) {
  const line = useMemo(() => {
    const nick = displayName?.trim() || "님";
    const waterMl = waterCups * cupMl;
    const lowWaterThreshold = Math.max(
      400,
      Math.round(Math.max(1, waterRecommendedMl) * 0.22)
    );

    if (zone === "empty" && totalCal <= 0 && mealCount === 0) {
      return `${nick}, 아직 0kcal네요? 굶는 다이어트는 결국 폭식을 부릅니다. 한 끼라도 기록해 봐요.`;
    }

    if (waterMl < lowWaterThreshold && mealCount > 0) {
      return `물 ${waterMl}ml? 오늘 권장 약 ${waterRecommendedMl.toLocaleString()}ml인데 아직 시작도 안 한 수준이에요. 컵 한 잔부터 올려요.`;
    }

    if (isFatHeavy(macros) && totalCal > 300) {
      return `오늘 지방이 상당히 올라왔어요. 기름진 메뉴는 내일로 미루는 게 어때요?`;
    }

    if (isProteinLow(macros, totalCal)) {
      return `단백질이 밀린 하루예요. 닭가슴살·두부·계란 중 하나만 더 챙겨도 달라져요.`;
    }

    if (zone === "danger") {
      return `목표 칼로리를 넘겼어요. 지금 후회하기보다 내일 아침을 가볍게 약속해요.`;
    }

    if (zone === "caution") {
      return `거의 한도선이에요. 간식은 "한 입" 규칙만 기억해요.`;
    }

    if (zone === "safe" && totalCal > 0) {
      const { sum } = macroKcalBreakdown(macros);
      if (sum > 0 && mealCount >= 2) {
        return `배분 나쁘지 않아요. 이러다 진짜 습관 됩니다.`;
      }
      return `여유 있게 가고 있어요. 기록하는 것 자체가 이미 상위 20%예요.`;
    }

    return `${nick}, 오늘도 기록 한 줄이 미래의 나한테 쪽지예요.`;
  }, [
    displayName,
    totalCal,
    mealCount,
    macros,
    waterCups,
    cupMl,
    waterRecommendedMl,
    zone,
  ]);

  const shownLine =
    aiLine != null && aiLine.trim() !== "" ? aiLine.trim() : line;

  const segments = useMemo(
    () => splitInsightIntoSegments(shownLine),
    [shownLine]
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border",
        "shadow-[0_1px_3px_rgba(15,23,42,0.06),0_0_14px_rgba(99,102,241,0.2)]",
        "dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),0_0_20px_rgba(99,102,241,0.22)]",
        compact
          ? "border-primary/12 px-3 py-2.5"
          : "mx-0 px-3.5 py-3",
        "border-primary/15 bg-gradient-to-br from-primary/6 via-background/80 to-scanner/8",
        "backdrop-blur-md dark:from-primary/15 dark:to-scanner/12",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
        "before:bg-[linear-gradient(to_right,rgb(99_102_241/0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.07)_1px,transparent_1px)]",
        "before:bg-[length:12px_12px] before:opacity-100",
        "dark:before:bg-[linear-gradient(to_right,rgb(148_163_184/0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgb(148_163_184/0.09)_1px,transparent_1px)]",
        className
      )}
    >
      <ul
        className={cn(
          "relative z-[1] m-0 list-none p-0",
          compact ? "space-y-1.5" : "space-y-2"
        )}
        role="list"
      >
        {segments.map((seg, i) => (
          <li
            key={`${i}-${seg.slice(0, 24)}`}
            className="flex gap-2.5"
          >
            <span
              className={cn(
                "shrink-0 select-none leading-snug",
                compact ? "text-[11px]" : "text-xs"
              )}
              aria-hidden
            >
              {INSIGHT_BULLET_ICONS[i % INSIGHT_BULLET_ICONS.length]}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1 leading-snug text-foreground/90",
                compact ? "text-xs" : "text-sm"
              )}
            >
              <InsightRichText text={seg} />
            </span>
          </li>
        ))}
      </ul>
      {aiPending ? (
        <p className="relative z-[1] mt-1.5 text-[10px] text-muted-foreground">
          분석 중…
        </p>
      ) : null}
      {!compact ? (
        <span
          className="absolute -bottom-1 left-6 h-2 w-2 rotate-45 border-b border-r border-primary/12 bg-gradient-to-br from-primary/5 to-transparent"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
