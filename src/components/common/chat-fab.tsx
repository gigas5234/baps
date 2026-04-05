"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Headset,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MacroTotals } from "@/lib/meal-macros";
import type { CoachStreamSegment } from "@/lib/coach-delimited-stream";
import { postCoachChat } from "@/lib/coach-chat-client";
import { trackBapsEvent } from "@/lib/analytics";
import {
  encodeCoachTurnForHistory,
  normalizeCoachReply,
  type CoachStrategicTurn,
  type DataCardPayload,
  type QuickChip,
} from "@/lib/chat-coach";
import {
  COACH_PERSONAS_UI,
  DEFAULT_COACH_PERSONA_ID,
  coachMeta,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import { interventionCodename } from "@/lib/coach-intervention-triggers";

interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
  /** opening만 문자열 / 턴 응답은 구조화 */
  coachTurn?: CoachStrategicTurn;
  data_card?: DataCardPayload | null;
  /** 스트리밍 중 단톡 태그 파싱 미리보기 */
  streamDelimited?: { segments: CoachStreamSegment[] };
  /** 완료 후에도 단톡·기습 등판([INVITE]) 연출 유지 */
  streamSegments?: CoachStreamSegment[];
}

const COACH_TAG_TO_PERSONA: Partial<Record<string, CoachPersonaId>> = {
  DIET: "diet",
  NUTRITION: "nutrition",
  EXERCISE: "exercise",
  MENTAL: "mental",
  ROI: "roi",
};

function DelimitedStreamBubbles({ segments }: { segments: CoachStreamSegment[] }) {
  return (
    <div className="space-y-2.5">
      {segments.map((seg, idx) => {
        if (seg.tag === "INVITE") {
          const code = seg.text.trim().toUpperCase();
          const pid = COACH_TAG_TO_PERSONA[code];
          const title = pid ? interventionCodename(pid) : code;
          const emoji = pid ? coachMeta(pid).emoji : "📣";
          return (
            <div
              key={`invite-${idx}-${code}`}
              className="rounded-lg border border-dashed border-primary/35 bg-primary/[0.06] px-2 py-2 text-center dark:border-primary/28 dark:bg-primary/[0.08]"
            >
              <p className="text-[10px] font-semibold tracking-wide text-primary">
                <span aria-hidden>{emoji}</span> 시스템
              </p>
              <p className="mt-1 font-mono text-[10px] leading-snug text-foreground/90">
                ── {title}님이 대화에 참여했습니다 ──
              </p>
            </div>
          );
        }
        const pid = COACH_TAG_TO_PERSONA[seg.tag];
        const isCoach = Boolean(pid);
        const coachLabel = pid ? coachMeta(pid).label : "";
        const coachEmoji = pid ? coachMeta(pid).emoji : "";
        return (
          <div
            key={`${seg.tag}-${idx}`}
            className={cn(
              "rounded-lg border px-2.5 py-2 text-[13px] leading-snug",
              seg.complete
                ? "border-border/80 bg-background/40"
                : "border-primary/35 bg-primary/[0.04]",
              isCoach &&
                "border-rose-500/18 bg-rose-500/[0.05] dark:border-rose-400/20"
            )}
          >
            <p className="text-[10px] font-bold tracking-wide text-muted-foreground">
              <span className="font-mono text-[9px] text-primary/90">
                [{seg.tag}]
              </span>
              {isCoach ? (
                <span className="ml-1.5 font-semibold text-foreground">
                  <span className="select-none" aria-hidden>
                    {coachEmoji}{" "}
                  </span>
                  {coachLabel} 코치
                  {!seg.complete ? (
                    <span className="ml-1 text-[9px] font-normal text-primary animate-pulse">
                      입력 중…
                    </span>
                  ) : null}
                </span>
              ) : seg.tag === "ANALYSIS" ? (
                <span className="ml-1.5">분석</span>
              ) : seg.tag === "MISSION" ? (
                <span className="ml-1.5">미션</span>
              ) : (
                <span className="ml-1.5">{seg.tag}</span>
              )}
            </p>
            <p className="mt-1 text-foreground/90 whitespace-pre-wrap break-words">
              {seg.text || (!seg.complete ? "…" : "")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface ChatFabProps {
  /** 서버에서 식사·프로필 컨텍스트를 조회할 캘린더 날짜 (YYYY-MM-DD) */
  selectedDate: string;
  totalCal: number;
  targetCal: number;
  macros: MacroTotals;
}

function formatInlineBold(
  text: string,
  variant: "default" | "coach" | "coach-roast" = "default"
): ReactNode {
  const strongCls =
    variant === "default"
      ? "font-semibold text-foreground tabular-nums"
      : variant === "coach-roast"
        ? "not-italic font-bold text-primary tabular-nums"
        : "font-bold text-primary tabular-nums";
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={strongCls}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function CoachStrategicTurnView({ turn }: { turn: CoachStrategicTurn }) {
  const quips =
    turn.coach_quips?.filter((q) => q.zinger?.trim()) ?? [];
  const showGroup = quips.length > 0;

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div>
        <p
          className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-primary"
          role="heading"
          aria-level={3}
        >
          <span className="select-none" aria-hidden>
            🔍
          </span>
          분석
        </p>
        <p className="mt-1 text-foreground/90">
          {formatInlineBold(turn.analysis, "coach")}
        </p>
      </div>
      {showGroup ? (
        <div>
          <p
            className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#FF3355] dark:text-[#FF4D6A]"
            role="heading"
            aria-level={3}
          >
            <span className="select-none" aria-hidden>
              💬
            </span>
            감시 단톡
          </p>
          <div className="mt-1.5 space-y-2">
            {quips.map((q, idx) => {
              const meta = coachMeta(q.persona_id);
              return (
                <div
                  key={`${q.persona_id}-${idx}`}
                  className={cn(
                    "rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 py-2",
                    "dark:border-rose-400/25 dark:bg-rose-500/10"
                  )}
                >
                  <p className="text-[10px] font-bold text-foreground/90">
                    <span className="select-none" aria-hidden>
                      {meta.emoji}
                    </span>{" "}
                    {meta.label} 코치
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-[13px] italic leading-snug text-foreground/95",
                      "border-l-2 border-rose-400/50 pl-2"
                    )}
                  >
                    {formatInlineBold(q.zinger, "coach-roast")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <p
            className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#FF3355] dark:text-[#FF4D6A]"
            role="heading"
            aria-level={3}
          >
            <span className="select-none" aria-hidden>
              🚨
            </span>
            경고
          </p>
          <p
            className={cn(
              "mt-1 rounded-lg border border-amber-200/55 bg-amber-100/50 px-2.5 py-2 italic leading-relaxed",
              "text-foreground/95 ring-1 ring-amber-300/25",
              "dark:border-amber-500/35 dark:bg-amber-400/12 dark:ring-amber-400/15"
            )}
          >
            {formatInlineBold(turn.roast, "coach-roast")}
          </p>
        </div>
      )}
      <div
        className={cn(
          "rounded-xl border border-teal-500/35 bg-teal-500/[0.08] px-2.5 py-2",
          "dark:border-teal-400/30 dark:bg-teal-400/[0.1]"
        )}
      >
        <p
          className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-teal-600 dark:text-teal-400"
          role="heading"
          aria-level={3}
        >
          <span className="select-none" aria-hidden>
            🎯
          </span>
          미션
        </p>
        <p className="mt-1 text-foreground/90">
          {formatInlineBold(turn.mission, "coach")}
        </p>
      </div>
    </div>
  );
}

function CoachDataCardView({
  card,
  onAction,
}: {
  card: DataCardPayload;
  onAction: (prompt: string) => void;
}) {
  const show =
    Boolean(card.headline?.trim()) ||
    Boolean(card.summary?.trim()) ||
    (card.bullets?.length ?? 0) > 0 ||
    (card.actions?.length ?? 0) > 0;
  if (!show) return null;

  return (
    <div
      className={cn(
        "mt-2 rounded-2xl border border-border/90 bg-card/90 px-3.5 py-3",
        "shadow-sm dark:border-white/10 dark:bg-card/70"
      )}
    >
      {card.headline?.trim() ? (
        <p className="text-sm font-bold leading-snug text-foreground">
          {card.headline}
        </p>
      ) : null}
      {card.summary?.trim() ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground dark:text-foreground/75">
          {formatInlineBold(card.summary)}
        </p>
      ) : null}
      {card.bullets?.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground dark:text-foreground/80">
          {card.bullets.map((b, idx) => (
            <li key={idx}>{formatInlineBold(b)}</li>
          ))}
        </ul>
      ) : null}
      {card.actions?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {card.actions.map((a, idx) => (
            <button
              key={`${a.label}-${idx}`}
              type="button"
              onClick={() => onAction(a.prompt)}
              className={cn(
                "rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 text-left text-xs font-medium",
                "text-foreground transition-colors hover:bg-primary/18 active:scale-[0.99]"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CoachPersonaPicker({
  value,
  onChange,
  disabled,
}: {
  value: CoachPersonaId;
  onChange: (id: CoachPersonaId) => void;
  disabled: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-2.5",
        "dark:border-rose-400/18 dark:bg-rose-500/[0.07]"
      )}
    >
      <p className="flex items-center gap-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
        <Headset className="h-3.5 w-3.5 shrink-0" aria-hidden />
        담당 코치 (말투·초점)
      </p>
      <div
        className={cn(
          "flex gap-1.5 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin",
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
        role="listbox"
        aria-label="코치 선택"
      >
        {COACH_PERSONAS_UI.map((c) => {
          const active = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={active}
              disabled={disabled}
              title={c.description}
              onClick={() => onChange(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1.5 text-left transition-colors",
                "text-[10px] font-semibold leading-tight",
                active
                  ? "border-primary bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-muted/30 text-foreground hover:bg-muted/55",
                "disabled:pointer-events-none disabled:opacity-45",
                "dark:border-white/12 dark:bg-muted/20"
              )}
            >
              <span className="mr-0.5 select-none" aria-hidden>
                {c.emoji}
              </span>
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuickChipRow({
  chips,
  disabled,
  onPick,
}: {
  chips: QuickChip[];
  disabled: boolean;
  onPick: (prompt: string) => void;
}) {
  if (!chips.length) return null;
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-muted-foreground/35 bg-muted/30 p-2.5",
        "dark:border-white/12 dark:bg-muted/20"
      )}
    >
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <ListTodo className="h-3.5 w-3.5 shrink-0" aria-hidden />
        추천 질문
        <span className="font-normal normal-case text-[9px] text-muted-foreground/85">
          · 탭하면 입력 없이 전송
        </span>
      </p>
      <div className="flex flex-col gap-1.5">
        {chips.map((c, i) => (
          <button
            key={`${c.label}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(c.prompt)}
            className={cn(
              "flex w-full max-w-full shrink-0 items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left",
              "text-[11px] font-medium leading-snug text-foreground",
              "transition-colors hover:bg-muted/70 active:scale-[0.99]",
              "disabled:pointer-events-none disabled:opacity-45",
              "dark:border-white/12 dark:bg-card/80 dark:hover:bg-muted/40"
            )}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[9px] font-bold text-muted-foreground"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatFab({
  selectedDate,
  totalCal,
  targetCal,
  macros,
}: ChatFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickChips, setQuickChips] = useState<QuickChip[]>([]);
  const [coachPersona, setCoachPersona] = useState<CoachPersonaId>(
    DEFAULT_COACH_PERSONA_ID
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  /** 스트리밍 JSON 꼬리 (단톡 UI 맛) */
  const [bootStreamHint, setBootStreamHint] = useState("");
  const wasChatOpenRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** send 직후에도 최신 대화로 history를 만들기 위함 (칩/카드는 입력 없이 즉시 API) */
  const messagesRef = useRef<ChatMessage[]>([]);
  /** opening 메시지가 현재 coachPersona와 이미 맞는지 (중복 부트스트랩 방지) */
  const openingCoachSynced = useRef<CoachPersonaId | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isOpen) openingCoachSynced.current = null;
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bootLoading, isLoading, bootStreamHint]);

  useEffect(() => {
    if (wasChatOpenRef.current && !isOpen) {
      const thread = messagesRef.current;
      const sawCoachQuips = thread.some(
        (m) =>
          m.is_ai &&
          m.coachTurn?.coach_quips &&
          m.coachTurn.coach_quips.length > 0
      );
      if (sawCoachQuips) {
        const lastWithQuips = [...thread]
          .reverse()
          .find(
            (m) =>
              m.coachTurn?.coach_quips && m.coachTurn.coach_quips.length > 0
          );
        const coachIds =
          lastWithQuips?.coachTurn?.coach_quips?.map((q) => q.persona_id) ?? [];
        trackBapsEvent("coach_intervention_canceled", {
          surface: "chat_fab",
          reason: "closed_panel_after_coach_quips",
          coach_personas: [...new Set(coachIds)],
        });
      }
    }
    wasChatOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return;

    let cancelled = false;
    setBootLoading(true);
    setBootStreamHint("");

    (async () => {
      try {
        const outcome = await postCoachChat(
          {
            bootstrap: true,
            coach_id: coachPersona,
            date: selectedDate,
            local_hour: new Date().getHours(),
          },
          {
            onStreamRaw: (raw) => {
              if (!cancelled)
                setBootStreamHint(
                  raw.length > 320 ? `…${raw.slice(-320)}` : raw
                );
            },
          }
        );
        if (cancelled) return;

        const { ok, status, data } = outcome;
        const d = data as Record<string, unknown>;

        if (status === 401) {
          const first: ChatMessage[] = [
            {
              id: `ai-open-${Date.now()}`,
              is_ai: true,
              message:
                typeof d.error === "string"
                  ? d.error
                  : "로그인 후 이용할 수 있어요.",
              data_card: null,
            },
          ];
          messagesRef.current = first;
          setMessages(first);
          setQuickChips([]);
          openingCoachSynced.current = coachPersona;
        } else if (ok) {
          const opening =
            typeof d.opening === "string"
              ? d.opening
              : "데이터는 준비됐어. 뭐부터 물어볼래?";
          const chips: QuickChip[] = Array.isArray(d.quick_chips)
            ? (d.quick_chips as QuickChip[]).slice(0, 3)
            : [];

          const first: ChatMessage[] = [
            {
              id: `ai-open-${Date.now()}`,
              is_ai: true,
              message: opening,
              data_card: null,
            },
          ];
          messagesRef.current = first;
          setMessages(first);
          setQuickChips(chips);
          openingCoachSynced.current = coachPersona;
        } else {
          const msg =
            typeof d.error === "string"
              ? d.error
              : "코치를 불러오지 못했어요.";
          const first: ChatMessage[] = [
            {
              id: `ai-open-${Date.now()}`,
              is_ai: true,
              message: msg,
              data_card: null,
            },
          ];
          messagesRef.current = first;
          setMessages(first);
          setQuickChips([]);
          openingCoachSynced.current = coachPersona;
        }
      } catch {
        if (!cancelled) {
          const fail: ChatMessage[] = [
            {
              id: `ai-fail-${Date.now()}`,
              is_ai: true,
              message:
                "연결이 꽤 느리네. 한번 더 열어보거나, 입력으로 바로 물어봐.",
              data_card: null,
            },
          ];
          messagesRef.current = fail;
          setMessages(fail);
          setQuickChips([
            {
              label: "오늘 식단 평가",
              prompt: "오늘 식단을 팩트로 짧게 평가해줘.",
            },
            {
              label: "남은 칼로리",
              prompt: "남은 칼로리를 숫자로 말해줘.",
            },
            {
              label: "저녁 추천",
              prompt: "저녁에 뭐 먹으면 좋을지 추천해줘.",
            },
          ]);
        }
      } finally {
        if (!cancelled) {
          setBootLoading(false);
          setBootStreamHint("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, messages.length, coachPersona, selectedDate]);

  /** 유저 턴 없이 코칭만 바꿀 때 opening 재생성 */
  useEffect(() => {
    if (!isOpen || bootLoading || isLoading) return;
    const m = messagesRef.current;
    const onlyOpening =
      m.length === 1 && m[0].is_ai && !m[0].coachTurn;
    if (!onlyOpening) return;
    if (openingCoachSynced.current === coachPersona) return;

    let cancelled = false;
    setBootLoading(true);
    setBootStreamHint("");

    (async () => {
      try {
        const outcome = await postCoachChat(
          {
            bootstrap: true,
            coach_id: coachPersona,
            date: selectedDate,
            local_hour: new Date().getHours(),
          },
          {
            onStreamRaw: (raw) => {
              if (!cancelled)
                setBootStreamHint(
                  raw.length > 320 ? `…${raw.slice(-320)}` : raw
                );
            },
          }
        );
        if (cancelled) return;

        const { ok, status, data } = outcome;
        const d = data as Record<string, unknown>;

        if (status === 401) {
          const next: ChatMessage[] = [
            {
              id: `ai-open-${Date.now()}`,
              is_ai: true,
              message:
                typeof d.error === "string"
                  ? d.error
                  : "로그인 후 이용할 수 있어요.",
              data_card: null,
            },
          ];
          messagesRef.current = next;
          setMessages(next);
          openingCoachSynced.current = coachPersona;
          return;
        }

        if (!ok) {
          const next: ChatMessage[] = [
            {
              id: `ai-open-${Date.now()}`,
              is_ai: true,
              message:
                typeof d.error === "string"
                  ? d.error
                  : "코치를 불러오지 못했어요.",
              data_card: null,
            },
          ];
          messagesRef.current = next;
          setMessages(next);
          setQuickChips([]);
          openingCoachSynced.current = coachPersona;
          return;
        }

        const opening =
          typeof d.opening === "string"
            ? d.opening
            : "데이터는 준비됐어. 뭐부터 물어볼래?";
        const chips: QuickChip[] = Array.isArray(d.quick_chips)
          ? (d.quick_chips as QuickChip[]).slice(0, 3)
          : [];

        const next: ChatMessage[] = [
          {
            id: `ai-open-${Date.now()}`,
            is_ai: true,
            message: opening,
            data_card: null,
          },
        ];
        messagesRef.current = next;
        setMessages(next);
        setQuickChips(chips);
        openingCoachSynced.current = coachPersona;
      } catch {
        /* 유지 */
      } finally {
        if (!cancelled) {
          setBootLoading(false);
          setBootStreamHint("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coachPersona, isOpen, bootLoading, isLoading, selectedDate]);

  /**
   * @param source chip | card — 입력창을 거치지 않고 곧바로 API만 호출. 보내기 버튼은 직접 입력용.
   */
  const sendWithText = async (
    raw: string,
    source: "input" | "chip" | "card" = "input"
  ) => {
    const text = raw.trim();
    if (!text || isLoading || bootLoading) return;

    const prior = messagesRef.current;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}-${source}`,
      message: text,
      is_ai: false,
    };
    const streamId = `ai-stream-${Date.now()}`;
    const streamBubble: ChatMessage = {
      id: streamId,
      is_ai: true,
      message: "단톡 수신 중…",
      data_card: null,
      streamDelimited: { segments: [] },
    };
    const nextThread = [...prior, userMsg, streamBubble];
    messagesRef.current = nextThread;
    setMessages(nextThread);
    setInput("");
    setQuickChips([]);
    setIsLoading(true);

    try {
      const historyForApi = prior.map((m) => ({
        message:
          m.is_ai && m.coachTurn
            ? encodeCoachTurnForHistory(m.coachTurn)
            : m.message,
        is_ai: m.is_ai,
      }));

      const outcome = await postCoachChat(
        {
          message: text,
          coach_id: coachPersona,
          date: selectedDate,
          local_hour: new Date().getHours(),
          history: historyForApi.slice(-12),
        },
        {
          onDelimitedPreview: (p) => {
            const mapped = messagesRef.current.map((m) =>
              m.id === streamId
                ? {
                    ...m,
                    streamDelimited: p,
                    message:
                      p.segments.length === 0
                        ? "단톡 수신 중…"
                        : `단톡 · ${p.segments.length}블록`,
                  }
                : m
            );
            messagesRef.current = mapped;
            setMessages(mapped);
          },
        }
      );

      const data = outcome.data as Record<string, unknown>;

      const withoutStream = messagesRef.current.filter((m) => m.id !== streamId);
      messagesRef.current = withoutStream;
      setMessages(withoutStream);

      if (
        outcome.status === 401 ||
        (data.error &&
          typeof data.analysis !== "string" &&
          typeof data.reply !== "string")
      ) {
        const errBubble: ChatMessage = {
          id: `ai-${Date.now()}`,
          is_ai: true,
          message:
            typeof data.error === "string"
              ? data.error
              : "응답을 받지 못했어요.",
          data_card: null,
        };
        const t = [...messagesRef.current, errBubble];
        messagesRef.current = t;
        setMessages(t);
        return;
      }

      if (!outcome.ok) {
        const errBubble: ChatMessage = {
          id: `ai-${Date.now()}`,
          is_ai: true,
          message:
            typeof data.error === "string"
              ? data.error
              : "응답을 받지 못했어요.",
          data_card: null,
        };
        const t = [...messagesRef.current, errBubble];
        messagesRef.current = t;
        setMessages(t);
        return;
      }

      const normalized = normalizeCoachReply(data);
      const streamSegmentsRaw = (
        data as { stream_segments?: CoachStreamSegment[] }
      ).stream_segments;
      const streamSegments =
        Array.isArray(streamSegmentsRaw) && streamSegmentsRaw.length > 0
          ? streamSegmentsRaw
          : undefined;
      const coachTurn: CoachStrategicTurn = {
        analysis: normalized.analysis,
        roast: normalized.roast,
        mission: normalized.mission,
        coach_quips: normalized.coach_quips,
      };

      const aiBubble: ChatMessage = {
        id: `ai-${Date.now()}`,
        is_ai: true,
        message: encodeCoachTurnForHistory(coachTurn),
        coachTurn,
        data_card: normalized.data_card ?? null,
        streamSegments,
      };
      const t = [...messagesRef.current, aiBubble];
      messagesRef.current = t;
      setMessages(t);
      setQuickChips(normalized.quick_chips ?? []);
    } catch {
      const cleaned = messagesRef.current.filter((m) => m.id !== streamId);
      messagesRef.current = cleaned;
      setMessages(cleaned);
      const errBubble: ChatMessage = {
        id: `err-${Date.now()}`,
        is_ai: true,
        message: "네트워크 오류가 발생했어요. 다시 시도해주세요.",
        data_card: null,
      };
      const t = [...messagesRef.current, errBubble];
      messagesRef.current = t;
      setMessages(t);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 flex flex-col bg-background"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold">전략 코칭</h2>
                <p className="text-[9px] font-medium text-muted-foreground">
                  위: 코치 응답 · 아래: 질문 템플릿(코치 말풍선과 별도)
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-primary">
                  {coachMeta(coachPersona).emoji}{" "}
                  {coachMeta(coachPersona).label} 코치 ·{" "}
                  {coachMeta(coachPersona).description}
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-foreground/65">
                  오늘 {totalCal}kcal · 목표 {targetCal}kcal · 단백{" "}
                  {Math.round(macros.proteinG)}g
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bootLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 pt-16 text-sm text-muted-foreground px-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>코치가 데이터 보고 입 열 준비 중…</span>
                  {bootStreamHint ? (
                    <p
                      className="w-full max-w-md font-mono text-[9px] leading-snug text-muted-foreground/80 break-all max-h-24 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 px-2 py-1.5"
                      aria-live="polite"
                    >
                      {bootStreamHint}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.is_ai ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.is_ai
                        ? "bg-muted text-foreground dark:bg-muted/80"
                        : "bg-primary text-primary-foreground"
                    )}
                  >
                    {msg.streamDelimited &&
                    msg.streamDelimited.segments.length > 0 ? (
                      <DelimitedStreamBubbles
                        segments={msg.streamDelimited.segments}
                      />
                    ) : msg.streamSegments && msg.streamSegments.length > 0 ? (
                      <DelimitedStreamBubbles segments={msg.streamSegments} />
                    ) : msg.is_ai && msg.coachTurn ? (
                      <CoachStrategicTurnView turn={msg.coachTurn} />
                    ) : (
                      <div>{formatInlineBold(msg.message)}</div>
                    )}
                    {msg.is_ai && msg.data_card ? (
                      <CoachDataCardView
                        card={msg.data_card}
                        onAction={(prompt) => void sendWithText(prompt, "card")}
                      />
                    ) : null}
                  </div>
                </div>
              ))}

              {isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>팩트 장전 중…</span>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-background/95 p-3 space-y-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <CoachPersonaPicker
                value={coachPersona}
                onChange={setCoachPersona}
                disabled={isLoading || bootLoading}
              />
              <QuickChipRow
                chips={quickChips}
                disabled={isLoading || bootLoading}
                onPick={(prompt) => void sendWithText(prompt, "chip")}
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void sendWithText(input, "input");
                  }}
                  placeholder="추천 칩은 누르면 바로 전송. 여기는 직접 입력 후 보내기"
                  className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading || bootLoading}
                />
                <button
                  type="button"
                  onClick={() => void sendWithText(input, "input")}
                  disabled={!input.trim() || isLoading || bootLoading}
                  className="rounded-2xl bg-primary p-2.5 text-primary-foreground shadow-lg shadow-primary/45 ring-1 ring-primary/25 disabled:opacity-40 active:scale-95 transition-transform"
                  aria-label="직접 입력 전송"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-4 z-40 rounded-2xl bg-primary p-3.5 text-primary-foreground shadow-lg shadow-primary/50 ring-1 ring-primary/30 active:scale-95 transition-transform"
          aria-label="전략 코칭 열기"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
