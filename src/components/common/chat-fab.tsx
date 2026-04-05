"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Headset,
  ListTodo,
  ChevronDown,
  ChevronUp,
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
import {
  formatInlineBold,
  KakaoDelimitedCoachStream,
  KakaoOpeningCoachMessage,
  KakaoStrategicTurnView,
} from "@/components/common/kakao-coach-bubbles";
import { formatKoreanChatTime } from "@/lib/coach-chat-time";

interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
  /** 수신·전송 시각 (카톡형 타임스탬프) */
  createdAt?: number;
  /** opening만 문자열 / 턴 응답은 구조화 */
  coachTurn?: CoachStrategicTurn;
  data_card?: DataCardPayload | null;
  /** 스트리밍 중 단톡 태그 파싱 미리보기 */
  streamDelimited?: { segments: CoachStreamSegment[] };
  /** 완료 후에도 단톡·기습 등판([INVITE]) 연출 유지 */
  streamSegments?: CoachStreamSegment[];
}

interface ChatFabProps {
  /** 서버에서 식사·프로필 컨텍스트를 조회할 캘린더 날짜 (YYYY-MM-DD) */
  selectedDate: string;
  totalCal: number;
  targetCal: number;
  macros: MacroTotals;
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
  /** 코치·추천 질문 영역 접기 (대화 가리지 않도록) */
  const [accessoryExpanded, setAccessoryExpanded] = useState(true);
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
    if (isOpen) setAccessoryExpanded(true);
  }, [isOpen]);

  /** 채팅 패널이 열린 동안 뒤 메인 스크롤 차단 */
  useEffect(() => {
    if (!isOpen) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bootLoading, isLoading]);

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

    (async () => {
      try {
        const outcome = await postCoachChat({
          bootstrap: true,
          coach_id: coachPersona,
          date: selectedDate,
          local_hour: new Date().getHours(),
        });
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
              createdAt: Date.now(),
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
              createdAt: Date.now(),
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
              createdAt: Date.now(),
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
              createdAt: Date.now(),
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

    (async () => {
      try {
        const outcome = await postCoachChat({
          bootstrap: true,
          coach_id: coachPersona,
          date: selectedDate,
          local_hour: new Date().getHours(),
        });
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
              createdAt: Date.now(),
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
              createdAt: Date.now(),
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
            createdAt: Date.now(),
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
      createdAt: Date.now(),
    };
    const streamId = `ai-stream-${Date.now()}`;
    const streamStartedAt = Date.now();
    const streamBubble: ChatMessage = {
      id: streamId,
      is_ai: true,
      message: "단톡 수신 중…",
      data_card: null,
      streamDelimited: { segments: [] },
      createdAt: streamStartedAt,
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
          createdAt: Date.now(),
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
          createdAt: Date.now(),
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
        createdAt: Date.now(),
      };
      const t = [...messagesRef.current, aiBubble];
      messagesRef.current = t;
      setMessages(t);
      const chips = normalized.quick_chips ?? [];
      setQuickChips(chips);
      if (chips.length > 0) setAccessoryExpanded(true);
    } catch {
      const cleaned = messagesRef.current.filter((m) => m.id !== streamId);
      messagesRef.current = cleaned;
      setMessages(cleaned);
      const errBubble: ChatMessage = {
        id: `err-${Date.now()}`,
        is_ai: true,
        message: "네트워크 오류가 발생했어요. 다시 시도해주세요.",
        data_card: null,
        createdAt: Date.now(),
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
            className="fixed inset-0 z-50 flex max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground overscroll-none touch-pan-y"
          >
            <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
              <div>
                <h2 className="text-base font-bold text-foreground">감시 단톡</h2>
                <p className="text-[9px] font-medium text-muted-foreground">
                  카톡형 코칭 · 아래 추천 질문은 말풍선 밖 템플릿
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-primary">
                  {coachMeta(coachPersona).emoji}{" "}
                  {coachMeta(coachPersona).label} 코치 ·{" "}
                  {coachMeta(coachPersona).description}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  오늘 {totalCal}kcal · 목표 {targetCal}kcal · 단백{" "}
                  {Math.round(macros.proteinG)}g ·{" "}
                  {formatKoreanChatTime(new Date())}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 touch-pan-y space-y-3 overflow-y-auto overscroll-y-contain bg-background p-4">
              {bootLoading && messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-3 pt-16 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>코치가 데이터 보고 입 열 준비 중…</span>
                </div>
              ) : null}

              {messages.map((msg) => {
                const ts = msg.createdAt ?? Date.now();
                const receivedAt = new Date(ts);
                const hasStream =
                  (msg.streamDelimited?.segments?.length ?? 0) > 0 ||
                  (msg.streamSegments?.length ?? 0) > 0;

                if (!msg.is_ai) {
                  return (
                    <div
                      key={msg.id}
                      className="flex justify-end"
                    >
                      <div className="flex max-w-[min(100%,20rem)] flex-row-reverse items-start gap-1.5">
                        <div
                          className={cn(
                            "rounded-[14px] bg-[#FEE500] px-3 py-2 text-[13px] leading-snug text-[#191919]",
                            "shadow-sm"
                          )}
                        >
                          <span className="whitespace-pre-wrap break-words">
                            {formatInlineBold(msg.message, "bubble")}
                          </span>
                        </div>
                        <span className="mt-2 shrink-0 self-start text-[10px] tabular-nums text-muted-foreground">
                          {formatKoreanChatTime(receivedAt)}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className="flex max-w-[min(100%,24rem)] justify-start">
                    <div className="min-w-0 flex-1 space-y-2">
                      {hasStream ? (
                        <KakaoDelimitedCoachStream
                          segments={
                            (msg.streamDelimited?.segments?.length
                              ? msg.streamDelimited.segments
                              : msg.streamSegments) ?? []
                          }
                          receivedAt={receivedAt}
                        />
                      ) : msg.coachTurn ? (
                        <KakaoStrategicTurnView
                          turn={msg.coachTurn}
                          receivedAt={receivedAt}
                        />
                      ) : (
                        <KakaoOpeningCoachMessage
                          text={msg.message}
                          coachId={coachPersona}
                          receivedAt={receivedAt}
                        />
                      )}
                      {msg.data_card ? (
                        <CoachDataCardView
                          card={msg.data_card}
                          onAction={(prompt) => void sendWithText(prompt, "card")}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                  <span>팩트 장전 중…</span>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border bg-card pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setAccessoryExpanded((e) => !e)}
                className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left text-muted-foreground transition-colors hover:bg-muted/70"
                aria-expanded={accessoryExpanded}
              >
                <span className="text-[11px] font-semibold text-muted-foreground">
                  담당 코치 · 추천 질문{" "}
                  {quickChips.length > 0 ? (
                    <span className="font-normal text-muted-foreground/85">
                      ({quickChips.length})
                    </span>
                  ) : null}
                </span>
                {accessoryExpanded ? (
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <ChevronUp
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </button>
              {accessoryExpanded ? (
                <div className="space-y-2.5 p-3">
              <CoachPersonaPicker
                value={coachPersona}
                onChange={setCoachPersona}
                disabled={isLoading}
              />
              <QuickChipRow
                chips={quickChips}
                disabled={isLoading || bootLoading}
                onPick={(prompt) => void sendWithText(prompt, "chip")}
              />
                </div>
              ) : null}
              <div className="flex items-center gap-2 px-3 pb-3 pt-1">
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
          className="fixed right-4 z-40 rounded-2xl bg-primary p-3.5 text-primary-foreground shadow-lg shadow-primary/50 ring-1 ring-primary/30 transition-transform active:scale-95 max-[480px]:bottom-[7.5rem] min-[481px]:bottom-28"
          aria-label="전략 코칭 열기"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
