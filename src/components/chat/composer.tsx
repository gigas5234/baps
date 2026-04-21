// src/components/chat/composer.tsx
// Chat v2 — 입력부. quick chips + text input + voice + send.
// chat-fab.tsx 내부의 inline 입력 블록 + QuickChipRow + VoiceSessionHudFrame 호출부 흡수.
"use client";

import { cn } from "@/lib/utils";
import { Send, Mic, MicOff } from "lucide-react";
import { COACH_HUES } from "@/lib/chat-tokens";
import type { QuickChip } from "@/lib/chat-coach";
import type { CoachPersonaId } from "@/lib/coach-personas";

interface ComposerProps {
  persona: CoachPersonaId;
  value: string;
  quickChips: QuickChip[];
  showChips: boolean;
  voiceActive: boolean;
  disabled?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onChip: (chip: QuickChip) => void;
  onVoiceToggle: () => void;
}

export function Composer({
  persona, value, quickChips, showChips,
  voiceActive, disabled, placeholder,
  onChange, onSubmit, onChip, onVoiceToggle,
}: ComposerProps) {
  const hue = COACH_HUES[persona];
  return (
    <div className="relative z-[2] flex-shrink-0 px-3.5 pb-3.5 pt-1.5">
      {showChips && quickChips.length > 0 && (
        <div
          className="mb-2 flex gap-1.5 overflow-hidden"
          style={{ WebkitMaskImage: "linear-gradient(90deg,#000 88%,transparent)" }}
        >
          {quickChips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => onChip(c)}
              className="flex h-7 flex-shrink-0 items-center gap-1 rounded-full border px-3 font-sans text-[11px] font-semibold"
              style={{
                borderColor: hue.hue + "33",
                background: hue.soft,
                color: hue.ink,
              }}
            >
              <span
                aria-hidden
                className="size-1 rounded-full"
                style={{ background: hue.hue }}
              />
              {c.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-3.5 pr-1.5 shadow-sm"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "무엇이든 물어보세요"}
          disabled={disabled}
          className="flex-1 bg-transparent py-1.5 text-[13.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        <button
          type="button"
          onClick={onVoiceToggle}
          aria-pressed={voiceActive}
          aria-label={voiceActive ? "음성 입력 중지" : "음성 입력 시작"}
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            voiceActive
              ? "bg-foreground text-background"
              : "bg-muted/60 text-muted-foreground"
          )}
        >
          {voiceActive ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
        </button>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="보내기"
          className="flex size-8 items-center justify-center rounded-full text-white disabled:opacity-50"
          style={{ background: hue.hue }}
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
