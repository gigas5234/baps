// src/components/chat/chat-panel.tsx
// Chat v2 — 루트 · 레이아웃
// chat-fab.tsx의 ~2,000 LOC 대신 이 파일 하나에서 state 조합 + 4 view 스위칭.
// Thin composition only — 비즈 로직은 전부 훅으로 이동.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COACH_PERSONAS_UI,
  DEFAULT_COACH_PERSONA_ID,
  coachMeta,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import type { MacroTotals } from "@/lib/meal-macros";
import {
  postCoachChat,
  type CoachStrategicTurn,
} from "@/lib/coach-chat-client";
import { normalizeCoachReply } from "@/lib/chat-coach";
import {
  AMBIENT_AURA_STYLE,
  COACH_HUES,
  coachHueCssVars,
} from "@/lib/chat-tokens";

import { useCoachThread } from "./use-coach-thread";
import { useCoachTts, preloadCoachTts } from "./use-coach-tts";
import { useVoiceSession } from "./use-voice-session";
import {
  useAtriumBootstrap,
  readAtriumOnboardingDone,
  persistAtriumOnboardingDone,
} from "./use-atrium-bootstrap";
import { AtriumView } from "./atrium-view";
import { ThreadView } from "./thread-view";
import { Composer } from "./composer";

export type ChatPanelMode = "atrium" | "roster" | "thread";

export interface ChatPanelProps {
  selectedDate: string;
  totalCal: number;
  targetCal: number;
  macros: MacroTotals;
  listenerDisplayName?: string | null;
  onClose?: () => void;
}

export function ChatPanel({
  selectedDate,
  listenerDisplayName,
  onClose,
}: ChatPanelProps) {
  const [mode, setMode] = useState<ChatPanelMode>(() =>
    readAtriumOnboardingDone() ? "thread" : "atrium"
  );
  const [persona, setPersona] = useState<CoachPersonaId>(DEFAULT_COACH_PERSONA_ID);
  const [input, setInput] = useState("");
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const hue = COACH_HUES[persona];
  const pMeta = coachMeta(persona);

  // Data hooks
  const { messages, append, commitTurn } = useCoachThread();
  const tts = useCoachTts({ persona });
  const { opening, quickChips } = useAtriumBootstrap({
    persona,
    selectedDate,
    userDisplayName: listenerDisplayName,
  });
  const voice = useVoiceSession({
    onFinal: (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
  });

  // TTS module preload after mount (LCP)
  useEffect(() => {
    const id = window.setTimeout(preloadCoachTts, 1200);
    return () => window.clearTimeout(id);
  }, []);

  // Open session → inject opening message once
  const openingSyncedRef = useRef<string>("");
  useEffect(() => {
    if (mode !== "thread") return;
    const key = persona + "::" + selectedDate;
    if (openingSyncedRef.current === key) return;
    openingSyncedRef.current = key;
    append({
      id: `opening::${key}`,
      is_ai: true,
      message: opening,
      createdAt: Date.now(),
    });
  }, [mode, persona, selectedDate, opening, append]);

  const startThread = useCallback(() => {
    persistAtriumOnboardingDone();
    setMode("thread");
    void tts.unlock();
  }, [tts]);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    const userId = "u-" + Date.now();
    const aiId = "a-" + Date.now();
    append({ id: userId, is_ai: false, message: text, createdAt: Date.now() });
    append({ id: aiId, is_ai: true, message: "", createdAt: Date.now() });
    setStreamingId(aiId);
    setInput("");

    try {
      const outcome = await postCoachChat({
        persona,
        selectedDate,
        message: text,
      });
      const normalized = normalizeCoachReply(outcome);
      commitTurn(
        aiId,
        normalized.turn as CoachStrategicTurn,
        normalized.dataCard,
        normalized.streamSegments
      );
    } finally {
      setStreamingId(null);
      tts.finalize();
    }
  }, [input, persona, selectedDate, append, commitTurn, tts]);

  return (
    <div
      style={{ ...coachHueCssVars(persona) }}
      className={cn(
        "relative flex h-full flex-col overflow-hidden bg-background text-foreground"
      )}
    >
      {/* Ambient aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={AMBIENT_AURA_STYLE}
      />

      {/* Top bar */}
      <header className="relative z-[2] flex flex-shrink-0 items-center gap-3 px-4 pb-2.5 pt-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="flex size-9 items-center justify-center rounded-xl bg-card shadow-sm"
        >
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          {mode === "atrium" ? (
            <h2 className="text-[15px] font-bold tracking-[-0.02em]">코치 룸</h2>
          ) : (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-[-0.01em]">
                <span>{pMeta.emoji}</span>
                {pMeta.name} 코치
                <span
                  className="ml-0.5 rounded-[4px] px-1.5 py-[2px] font-mono text-[9px] font-semibold tracking-[0.05em]"
                  style={{ color: hue.ink, background: hue.soft }}
                >
                  {hue.label.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{pMeta.role}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={tts.toggle}
          aria-pressed={tts.enabled}
          aria-label="TTS 끄기/켜기"
          className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold text-muted-foreground"
        >
          {tts.enabled ? <Volume2 className="size-3" /> : <VolumeX className="size-3" />}
          TTS
        </button>
      </header>

      {/* Body */}
      <div className="relative z-[1] flex flex-1 min-h-0 flex-col overflow-hidden">
        {mode === "atrium" && (
          <AtriumView
            selected={persona}
            opened={false}
            userDisplayName={listenerDisplayName}
            onSelect={(id) => {
              setPersona(id);
              setMode("roster");
            }}
            onStart={startThread}
          />
        )}
        {mode === "roster" && (
          <AtriumView
            selected={persona}
            opened
            userDisplayName={listenerDisplayName}
            onSelect={setPersona}
            onStart={startThread}
          />
        )}
        {mode === "thread" && (
          <ThreadView
            persona={persona}
            personaLabel={pMeta.name}
            personaEmoji={pMeta.emoji}
            messages={messages}
            streamingId={streamingId}
            ttsSpeaking={tts.speaking}
            sessionLabel={`SESSION · ${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}`}
          />
        )}
      </div>

      {/* Composer */}
      <Composer
        persona={persona}
        value={input}
        quickChips={mode === "thread" ? quickChips : []}
        showChips={mode === "thread"}
        voiceActive={voice.active}
        disabled={Boolean(streamingId)}
        placeholder={
          mode === "atrium"
            ? "코치를 고르거나 바로 질문하세요"
            : undefined
        }
        onChange={setInput}
        onSubmit={handleSubmit}
        onChip={(chip) => {
          setInput(chip.prompt);
          setTimeout(handleSubmit, 0);
        }}
        onVoiceToggle={() => {
          if (voice.active) voice.stop();
          else void voice.start();
        }}
      />
    </div>
  );
}
