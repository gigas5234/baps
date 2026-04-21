// src/components/chat/thread-view.tsx
// Chat v2 — Thread (대화 중)
// ChatMessage[] 를 렌더. 유저 버블은 단순, 코치 턴은 TurnCard, 스트리밍은 halo+EQ.
"use client";

import { cn } from "@/lib/utils";
import { TurnCard } from "./turn-card";
import { COACH_HUES, TTS_HALO_SHADOW } from "@/lib/chat-tokens";
import type { ChatMessage } from "./use-coach-thread";
import type { CoachPersonaId } from "@/lib/coach-personas";
import { formatKoreanChatTime } from "@/lib/coach-chat-time";
import { CoachTypewriter } from "@/components/common/coach-typewriter";

interface ThreadViewProps {
  persona: CoachPersonaId;
  personaLabel: string;
  personaEmoji: string;
  messages: ChatMessage[];
  streamingId?: string | null;
  ttsSpeaking: boolean;
  sessionLabel?: string;
}

export function ThreadView({
  persona, personaLabel, personaEmoji,
  messages, streamingId, ttsSpeaking, sessionLabel,
}: ThreadViewProps) {
  const hue = COACH_HUES[persona];
  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2">
      {sessionLabel && (
        <div className="mx-auto my-1 rounded-full bg-muted/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.08em] text-muted-foreground/70">
          {sessionLabel}
        </div>
      )}
      {messages.map((m) => {
        if (!m.is_ai) return <UserBubble key={m.id} message={m} />;
        const isStreaming = streamingId === m.id;
        if (isStreaming) {
          return (
            <StreamingBubble
              key={m.id}
              hue={hue}
              personaLabel={personaLabel}
              personaEmoji={personaEmoji}
              text={m.message}
              speaking={ttsSpeaking}
            />
          );
        }
        if (m.coachTurn) {
          return (
            <TurnCard
              key={m.id}
              persona={persona}
              personaLabel={personaLabel}
              personaEmoji={personaEmoji}
              turn={m.coachTurn}
              timestamp={m.createdAt}
            />
          );
        }
        return (
          <SimpleCoachBubble
            key={m.id}
            hue={hue}
            personaEmoji={personaEmoji}
            text={m.message}
            createdAt={m.createdAt}
          />
        );
      })}
    </div>
  );
}

function UserBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex items-end justify-end gap-1.5">
      {message.createdAt && (
        <span className="mb-1 font-mono text-[10px] tabular-nums text-muted-foreground/60">
          {formatKoreanChatTime(new Date(message.createdAt))}
        </span>
      )}
      <div className="max-w-[75%] rounded-[16px] rounded-br-[4px] bg-foreground px-3 py-2 text-[13.5px] leading-[1.45] text-background">
        {message.message}
      </div>
    </div>
  );
}

function SimpleCoachBubble({
  hue, personaEmoji, text, createdAt,
}: {
  hue: typeof COACH_HUES[CoachPersonaId];
  personaEmoji: string;
  text: string;
  createdAt?: number;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex size-7 flex-shrink-0 items-center justify-center rounded-xl text-base"
        style={{ background: hue.soft, color: hue.ink }}
      >
        {personaEmoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="max-w-full rounded-2xl border border-border bg-card px-3 py-2 text-[13px] leading-[1.5] text-foreground shadow-sm">
          {text}
        </div>
        {createdAt && (
          <span className="ml-0.5 mt-1 block font-mono text-[10px] tabular-nums text-muted-foreground/60">
            {formatKoreanChatTime(new Date(createdAt))}
          </span>
        )}
      </div>
    </div>
  );
}

function StreamingBubble({
  hue, personaLabel, personaEmoji, text, speaking,
}: {
  hue: typeof COACH_HUES[CoachPersonaId];
  personaLabel: string; personaEmoji: string; text: string; speaking: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div
        className={cn(
          "flex size-7 flex-shrink-0 items-center justify-center rounded-xl text-base",
          speaking && "animate-[chat-pulse_1.4s_ease-in-out_infinite]"
        )}
        style={{
          background: hue.soft, color: hue.ink,
          boxShadow: speaking ? TTS_HALO_SHADOW : undefined,
        }}
      >
        {personaEmoji}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className="rounded-2xl border bg-card px-3 py-2 text-[13px] leading-[1.5] text-foreground"
          style={{
            borderColor: hue.hue + "33",
            boxShadow: TTS_HALO_SHADOW,
          }}
        >
          <span
            className="mb-1.5 inline-block rounded-[4px] px-1.5 py-[2px] font-mono text-[9px] font-bold tracking-[0.1em]"
            style={{ color: hue.ink, background: hue.soft }}
          >
            분석 중
          </span>
          <CoachTypewriter text={text} enabled>
            {(visible) => <>{visible}</>}
          </CoachTypewriter>
        </div>
        {speaking && (
          <div className="ml-0.5 mt-1.5 flex items-center gap-1.5">
            <LiveEq hue={hue.hue} />
            <span
              className="font-mono text-[10px] font-semibold tracking-[0.05em]"
              style={{ color: hue.ink }}
            >
              {personaLabel} 코치 · 읽는 중
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function LiveEq({ hue }: { hue: string }) {
  return (
    <div className="flex h-3 items-end gap-[2px]" aria-hidden>
      {[0.4, 0.9, 0.6, 1, 0.7, 0.5, 0.8].map((_, i) => (
        <span
          key={i}
          className="w-[2px] origin-bottom rounded-[1px]"
          style={{
            height: "100%", background: hue, opacity: 0.85,
            animation: `chat-eq 0.8s ease-in-out infinite ${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}
