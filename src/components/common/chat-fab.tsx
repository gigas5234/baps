"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Meal } from "@/types/database";
import type { MacroTotals } from "@/lib/meal-macros";
import {
  encodeCoachTurnForHistory,
  type CoachStrategicTurn,
  type DataCardPayload,
  type QuickChip,
} from "@/lib/chat-coach";

interface ChatMessage {
  id: string;
  message: string;
  is_ai: boolean;
  /** opening만 문자열 / 턴 응답은 구조화 */
  coachTurn?: CoachStrategicTurn;
  data_card?: DataCardPayload | null;
}

interface ChatFabProps {
  meals: Meal[];
  totalCal: number;
  targetCal: number;
  waterCups: number;
  waterCupMl?: number;
  waterTargetCups?: number;
  waterRecommendedMl?: number;
  displayName?: string;
  bmr?: number | null;
  macros: MacroTotals;
}

function formatInlineBold(
  text: string,
  variant: "default" | "coach" = "default"
): ReactNode {
  const strongCls =
    variant === "coach"
      ? "font-bold text-primary tabular-nums"
      : "font-semibold text-foreground tabular-nums";
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
  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          분석
        </p>
        <p className="mt-0.5 text-foreground/95">
          {formatInlineBold(turn.analysis, "coach")}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          경고
        </p>
        <p className="mt-0.5 text-foreground/95">
          {formatInlineBold(turn.roast, "coach")}
        </p>
      </div>
      <div
        className={cn(
          "rounded-xl border border-primary/30 bg-primary/[0.07] px-2.5 py-2",
          "dark:border-primary/35 dark:bg-primary/[0.12]"
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          미션
        </p>
        <p className="mt-0.5 text-foreground/95">
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
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
      {chips.map((c, i) => (
        <button
          key={`${c.label}-${i}`}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c.prompt)}
          className={cn(
            "shrink-0 max-w-[85vw] rounded-2xl border border-primary/25 bg-primary/[0.06] px-3 py-2 text-left",
            "text-[11px] font-medium leading-snug text-foreground shadow-sm",
            "transition-colors hover:bg-primary/12 disabled:pointer-events-none disabled:opacity-45",
            "dark:border-primary/30 dark:bg-primary/10"
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function ChatFab({
  meals,
  totalCal,
  targetCal,
  waterCups,
  waterCupMl = 250,
  waterTargetCups = 8,
  displayName = "",
  bmr = null,
  macros,
}: ChatFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickChips, setQuickChips] = useState<QuickChip[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bootLoading, setBootLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** send 직후에도 최신 대화로 history를 만들기 위함 (칩/카드는 입력 없이 즉시 API) */
  const messagesRef = useRef<ChatMessage[]>([]);

  const buildContextPayload = useCallback(() => {
    const name = displayName?.trim() || "회원";
    return {
      user_profile: {
        name,
        target_cal: targetCal,
        current_cal: totalCal,
        bmr: bmr ?? null,
      },
      recent_meals: meals.map((m) => m.food_name),
      meal_lines: meals.map((m) => ({
        food_name: m.food_name,
        cal: m.cal,
        protein_g: Number(m.protein),
      })),
      macros_g: {
        carbs: macros.carbsG,
        protein: macros.proteinG,
        fat: macros.fatG,
      },
      water_cups: waterCups,
      water_cup_ml: waterCupMl,
      water_target_cups: waterTargetCups,
      local_hour: new Date().getHours(),
    };
  }, [
    displayName,
    targetCal,
    totalCal,
    bmr,
    meals,
    macros.carbsG,
    macros.proteinG,
    macros.fatG,
    waterCups,
    waterCupMl,
    waterTargetCups,
  ]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, bootLoading, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return;

    let cancelled = false;
    setBootLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bootstrap: true,
            context: buildContextPayload(),
          }),
        });
        const data = await res.json();
        if (cancelled) return;

        const opening =
          typeof data.opening === "string"
            ? data.opening
            : "데이터는 준비됐어. 뭐부터 물어볼래?";
        const chips: QuickChip[] = Array.isArray(data.quick_chips)
          ? data.quick_chips.slice(0, 3)
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
        if (!cancelled) setBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, messages.length, buildContextPayload]);

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
    const nextThread = [...prior, userMsg];
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: buildContextPayload(),
          history: historyForApi.slice(-12),
        }),
      });

      const data = await res.json();

      if (
        data.error &&
        typeof data.analysis !== "string" &&
        typeof (data as { reply?: string }).reply !== "string"
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

      let analysis =
        typeof data.analysis === "string" ? data.analysis.trim() : "";
      let roast = typeof data.roast === "string" ? data.roast.trim() : "";
      let mission = typeof data.mission === "string" ? data.mission.trim() : "";
      const legacyReply =
        typeof (data as { reply?: string }).reply === "string"
          ? (data as { reply: string }).reply.trim()
          : "";
      if (!analysis && legacyReply) analysis = legacyReply;
      if (!analysis) analysis = "응답 형식이 이상해.";
      if (!roast) roast = "—";
      if (!mission) mission = "다시 보내줘.";

      const coachTurn: CoachStrategicTurn = { analysis, roast, mission };

      const dataCard = data.data_card as DataCardPayload | undefined;
      const chips: QuickChip[] = Array.isArray(data.quick_chips)
        ? data.quick_chips.slice(0, 3)
        : [];

      const aiBubble: ChatMessage = {
        id: `ai-${Date.now()}`,
        is_ai: true,
        message: encodeCoachTurnForHistory(coachTurn),
        coachTurn,
        data_card: dataCard ?? null,
      };
      const t = [...messagesRef.current, aiBubble];
      messagesRef.current = t;
      setMessages(t);
      setQuickChips(chips);
    } catch {
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
                <div className="flex flex-col items-center justify-center gap-2 pt-16 text-sm text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>코치가 데이터 보고 입 열 준비 중…</span>
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
                    {msg.is_ai && msg.coachTurn ? (
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
