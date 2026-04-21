// src/components/chat/turn-card.tsx
// Chat v2 — Coach Turn Card (ANALYSIS / ROAST / MISSION 3블록 통합)
// chat-fab.tsx의 KakaoStrategicTurnView 대체. 카톡 꼬리·아바타 제거, 3 row 통합 카드.
"use client";

import { cn } from "@/lib/utils";
import { formatInlineBold } from "@/components/common/kakao-coach-bubbles";
import { COACH_HUES } from "@/lib/chat-tokens";
import type { CoachStrategicTurn } from "@/lib/chat-coach";
import type { CoachPersonaId } from "@/lib/coach-personas";

interface TurnCardProps {
  persona: CoachPersonaId;
  personaLabel: string;
  personaEmoji: string;
  turn: CoachStrategicTurn;
  timestamp?: number;
}

export function TurnCard({
  persona,
  personaLabel,
  personaEmoji,
  turn,
  timestamp,
}: TurnCardProps) {
  const hue = COACH_HUES[persona];

  return (
    <div className="flex items-start gap-2">
      {/* Vertical persona label — 공간 절약 */}
      <div className="flex w-7 flex-shrink-0 flex-col items-center gap-1.5 pt-1">
        <div
          className="flex size-7 items-center justify-center rounded-xl text-base"
          style={{ background: hue.soft, color: hue.ink }}
        >
          <span aria-hidden>{personaEmoji}</span>
        </div>
        <span
          className="font-mono text-[8px] font-bold tracking-[0.1em]"
          style={{
            color: hue.ink,
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          {personaLabel.toUpperCase()}
        </span>
      </div>

      {/* Turn content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
            "dark:bg-card/80"
          )}
        >
          {turn.analysis?.trim() && (
            <TurnBlock
              tag="ANALYSIS"
              color={hue.ink}
              bg={hue.soft}
              text={turn.analysis}
            />
          )}
          {turn.roast?.trim() && (
            <>
              <div className="h-px bg-border" />
              <TurnBlock
                tag="ROAST"
                color="#BE123C"
                bg="#FDE8EC"
                text={turn.roast}
                italic
              />
            </>
          )}
          {turn.mission?.trim() && (
            <>
              <div className="h-px bg-border" />
              <TurnBlock
                tag="MISSION"
                color="#B45309"
                bg="#FDECD0"
                text={turn.mission}
                bold
              />
            </>
          )}
        </div>
        {timestamp && (
          <span className="ml-0.5 mt-1 font-mono text-[10px] tabular-nums text-muted-foreground/70">
            {new Date(timestamp).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </span>
        )}
      </div>
    </div>
  );
}

function TurnBlock({
  tag,
  color,
  bg,
  text,
  italic,
  bold,
}: {
  tag: string;
  color: string;
  bg: string;
  text: string;
  italic?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="px-3.5 py-2.5">
      <span
        className="mb-1.5 inline-block rounded-[4px] px-1.5 py-[2px] font-mono text-[9px] font-bold tracking-[0.1em]"
        style={{ color, background: bg }}
      >
        {tag}
      </span>
      <p
        className={cn(
          "text-[13px] leading-[1.5] text-foreground",
          italic && "italic",
          bold ? "font-semibold" : "font-normal"
        )}
      >
        {formatInlineBold(text)}
      </p>
    </div>
  );
}
