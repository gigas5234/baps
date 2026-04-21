// src/components/chat/atrium-view.tsx
// Chat v2 — Atrium (첫 진입)
// "오늘 누구에게 감시받으실래요?" — 2×3 코치 그리드 + voice sample 태그.
"use client";

import { useEffect, useRef } from "react";
import {
  COACH_ATRIUM_BLURB,
  COACH_PERSONAS_UI,
  DEFAULT_COACH_PERSONA_ID,
  personalizeAtriumQuote,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import { COACH_HUES } from "@/lib/chat-tokens";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface AtriumViewProps {
  selected: CoachPersonaId;
  opened: boolean;
  userDisplayName?: string | null;
  onSelect: (id: CoachPersonaId) => void;
  onStart: () => void;
}

export function AtriumView({
  selected,
  opened,
  userDisplayName,
  onSelect,
  onStart,
}: AtriumViewProps) {
  const sel = COACH_PERSONAS_UI.find((c) => c.id === selected)
    ?? COACH_PERSONAS_UI.find((c) => c.id === DEFAULT_COACH_PERSONA_ID)!;
  const hue = COACH_HUES[sel.id];

  const detailRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (opened && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [opened, selected]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-2">
      {/* Welcome */}
      <header className="mt-3">
        <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70">
          BAPS · COACH ROOM
        </p>
        <h1 className="mt-1.5 text-[24px] font-extrabold leading-[1.15] tracking-[-0.03em] text-foreground">
          오늘 누구에게{" "}
          <span style={{ color: hue.hue }}>감시</span>받으실래요?
        </h1>
        <p className="mt-1.5 max-w-[26ch] text-[12px] leading-relaxed text-muted-foreground">
          다섯 코치 중 한 명을 골라요. 각자 관점과 말투가 다릅니다.
        </p>
      </header>

      {/* Grid */}
      <ul
        role="radiogroup"
        aria-label="코치 선택"
        className="grid grid-cols-2 gap-2.5"
      >
        {COACH_PERSONAS_UI.map((c) => {
          const ch = COACH_HUES[c.id];
          const isSel = c.id === selected && opened;
          return (
            <li key={c.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSel}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "relative w-full overflow-hidden rounded-2xl border p-2.5 text-left",
                  "transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isSel
                    ? "shadow-md"
                    : "border-border bg-card shadow-sm hover:border-foreground/15 active:scale-[0.98]"
                )}
                style={
                  isSel
                    ? {
                        background: ch.soft,
                        borderColor: ch.hue + "55",
                      }
                    : undefined
                }
              >
                {isSel && (
                  <span
                    aria-hidden
                    className="absolute right-2 top-2 size-1.5 rounded-full"
                    style={{
                      background: ch.hue,
                      boxShadow: `0 0 0 3px ${ch.hue}22`,
                    }}
                  />
                )}
                <span
                  className="block text-xl leading-none"
                  style={{ filter: isSel ? "none" : "grayscale(0.15)" }}
                >
                  {c.emoji}
                </span>
                <p className="mt-1.5 text-[13px] font-bold tracking-[-0.01em] text-foreground">
                  {c.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                  {COACH_ATRIUM_BLURB[c.id].tagline}
                </p>
                <span
                  className={cn(
                    "mt-2 inline-block max-w-full truncate rounded-[6px] border border-dashed px-1.5 py-[4px]",
                    "font-mono text-[9px] font-semibold tracking-[0.03em]"
                  )}
                  style={{
                    borderColor: ch.hue + "33",
                    color: ch.ink,
                    background: isSel ? "#fff" : "rgba(15,23,42,0.03)",
                  }}
                >
                  {c.description}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Detail panel on roster */}
      {opened && (
        <aside
          ref={detailRef}
          className="relative overflow-hidden rounded-2xl border border-border bg-card p-3.5 pb-3 shadow-md"
          aria-live="polite"
        >
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 w-[3px]"
            style={{ background: hue.hue }}
          />
          <p
            className="font-mono text-[11px] font-bold tracking-[0.08em]"
            style={{ color: hue.ink }}
          >
            {sel.label.toUpperCase()} · {COACH_ATRIUM_BLURB[sel.id].tagline}
          </p>
          <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-foreground">
            “{personalizeAtriumQuote(COACH_ATRIUM_BLURB[sel.id].quoteTpl, userDisplayName ?? "")}”
          </p>
          <button
            type="button"
            onClick={onStart}
            className={cn(
              "mt-3 flex h-[44px] w-full items-center justify-center gap-1.5 rounded-xl",
              "text-[14px] font-bold tracking-[-0.01em] text-white",
              "transition-transform active:scale-[0.98]"
            )}
            style={{ background: hue.hue }}
          >
            {sel.label} 코치 시작하기
            <ChevronRight className="size-4" />
          </button>
        </aside>
      )}
    </div>
  );
}
