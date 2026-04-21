"use client";

/**
 * EmptyState · P1-3
 * ─────────────────
 * 기존 상태(Timeline/Meals 빈 목록):
 *   - 회색 원 + UtensilsCrossed 아이콘 + "검거 로그가 비어 있어요" 텍스트 한 줄.
 *   - 시각적으로 "오류" 처럼 보이고, 다음 행동이 명확하지 않음.
 *
 * 개선 원칙 (Watcher 톤):
 *   1. 회색 죽음 대신 "시스템 대기 중" 무드 (primary 4% tint 배경)
 *   2. 1줄 → 2줄 (사실 · 행동) 구조
 *   3. 명확한 다음 행동을 **primary 버튼 1개**로만 제시 (위계)
 *   4. SVG 일러스트는 과하지 않게. 기본형은 글리프 프레임 + 아이콘.
 *
 * 쓰임:
 *   <EmptyState
 *      variant="timeline" // "timeline" | "meals" | "insights" | "generic"
 *      title="기록 대기 중"
 *      description="첫 끼니를 촬영하면 타임라인에 표시됩니다."
 *      action={{ label: "지금 촬영", onClick: () => openCamera() }}
 *      secondary={{ label: "직접 입력", onClick: () => openManual() }}
 *   />
 */

import * as React from "react";
import { Camera, UtensilsCrossed, Lightbulb, Radar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type EmptyVariant = "timeline" | "meals" | "insights" | "generic";

const ICON_MAP: Record<EmptyVariant, React.ReactNode> = {
  timeline: <UtensilsCrossed className="h-7 w-7" strokeWidth={1.75} />,
  meals:    <UtensilsCrossed className="h-7 w-7" strokeWidth={1.75} />,
  insights: <Lightbulb className="h-7 w-7" strokeWidth={1.75} />,
  generic:  <Radar className="h-7 w-7" strokeWidth={1.75} />,
};

interface EmptyStateProps {
  variant?: EmptyVariant;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondary?: { label: string; onClick: () => void };
  /** compact 카드용. 내부 패딩과 아이콘 크기 축소. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  variant = "generic",
  title,
  description,
  action,
  secondary,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center rounded-hero border",
        "bg-[var(--empty-surface)]",
        "border-[color:var(--empty-border)] border-dashed",
        compact ? "gap-2 px-5 py-8" : "gap-3 px-6 py-12",
        className
      )}
    >
      {/* Glyph frame — 테두리 링 + 미세 pulse */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          compact ? "h-14 w-14" : "h-16 w-16"
        )}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--primary) 18%, transparent) 0%, transparent 72%)",
          }}
          aria-hidden
        />
        <span
          className={cn(
            "relative flex h-full w-full items-center justify-center rounded-full",
            "bg-background/60 text-[color:var(--empty-glyph)]",
            "border border-[color:var(--empty-border)]",
            "[animation:empty-pulse_2.6s_ease-in-out_infinite]"
          )}
        >
          {ICON_MAP[variant]}
        </span>
      </div>

      <p
        className={cn(
          "text-center font-semibold text-[color:var(--empty-text-primary)]",
          compact ? "text-sm" : "text-[0.95rem]"
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "max-w-[22rem] text-center leading-snug text-[color:var(--empty-text-secondary)]",
          compact ? "text-[11px]" : "text-xs"
        )}
        style={{ textWrap: "pretty" }}
      >
        {description}
      </p>

      {action || secondary ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action ? (
            <Button
              tone="primary"
              size={compact ? "sm" : "md"}
              onClick={action.onClick}
            >
              {action.icon ?? <Camera />}
              {action.label}
            </Button>
          ) : null}
          {secondary ? (
            <Button
              tone="ghost"
              size={compact ? "sm" : "md"}
              onClick={secondary.onClick}
            >
              {secondary.label}
            </Button>
          ) : null}
        </div>
      ) : null}

      <style jsx>{`
        @keyframes empty-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.03); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
