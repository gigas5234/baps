"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { memo, useMemo } from "react";
import {
  COACH_DELIM_TAG_TO_PERSONA,
  filterDelimitedSegmentsForInvites,
  groupCoachStreamSegments,
  type CoachDelimTag,
  type CoachStreamSegment,
} from "@/lib/coach-delimited-stream";
import { CoachTypewriter, countCoachGraphemes } from "@/components/common/coach-typewriter";
import { formatKoreanChatTime } from "@/lib/coach-chat-time";
import { interventionCodename } from "@/lib/coach-intervention-triggers";
import {
  activeCoachQuips,
  type CoachStrategicTurn,
} from "@/lib/chat-coach";
import {
  coachMeta,
  COACH_AVATAR_SURFACE,
  COACH_TTS_VISUAL,
  DEFAULT_COACH_PERSONA_ID,
  TTS_ANALYSIS_VISUAL,
  TTS_MISSION_VISUAL,
  type CoachPersonaId,
  type CoachTtsVisualAccent,
} from "@/lib/coach-personas";
import { cn } from "@/lib/utils";

const TYPE_MS = 34;
const GROUP_GAP_MS = 300;

const COACH_TAG_TO_PERSONA = COACH_DELIM_TAG_TO_PERSONA;

function formatInlineBold(
  text: string,
  variant: "bubble" | "roast" = "bubble"
): ReactNode {
  /** bubble: 말풍선·카드가 이미 대비 색을 정함 — 강조만 굵게 두고 색은 상속 (미션 톤 다크배경에서 zinc-900 덮어쓰기 버그 방지) */
  const strongCls =
    variant === "bubble"
      ? "font-semibold tabular-nums text-inherit"
      : "font-bold text-rose-700 tabular-nums dark:text-rose-300";
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

function rowMetaForFirst(seg: CoachStreamSegment): {
  displayName: string;
  emoji: string;
  avatarClass: string;
} {
  if (seg.tag === "ANALYSIS") {
    return {
      displayName: "전술 요약",
      emoji: "📋",
      avatarClass:
        "bg-gradient-to-br from-slate-600 to-zinc-800 ring-2 ring-indigo-500/40",
    };
  }
  if (seg.tag === "MISSION") {
    return {
      displayName: "미션",
      emoji: "🎯",
      avatarClass:
        "bg-gradient-to-br from-teal-700 to-teal-950 ring-2 ring-violet-500/35",
    };
  }
  const pid = COACH_TAG_TO_PERSONA[seg.tag];
  if (pid) {
    const m = coachMeta(pid);
    return {
      displayName: `${m.label} 코치`,
      emoji: m.emoji,
      avatarClass: COACH_AVATAR_SURFACE[pid],
    };
  }
  return {
    displayName: seg.tag,
    emoji: "💬",
    avatarClass:
      "bg-gradient-to-br from-zinc-600 to-zinc-900 ring-2 ring-indigo-500/35",
  };
}

export function SingleKakaoCoachRow({
  displayName,
  emoji,
  avatarClass,
  timeLabel,
  bubbleVariant = "default",
  bubblePending = false,
  ttsActive = false,
  speakingAccent,
  ttsTapReplayEnabled = false,
  onTtsReplay,
  ttsReplayLabel,
  children,
}: {
  displayName: string;
  emoji: string;
  avatarClass: string;
  timeLabel: string;
  bubbleVariant?: "default" | "mission";
  /** 스트리밍 중인 말풍선(점선 테두리) */
  bubblePending?: boolean;
  /** TTS가 이 말풍선을 읽는 중 — 네온·글로우(행 CSS) */
  ttsActive?: boolean;
  speakingAccent?: CoachTtsVisualAccent;
  /** TTS ON일 때 행 탭으로 해당 말만 다시 재생 */
  ttsTapReplayEnabled?: boolean;
  onTtsReplay?: () => void;
  ttsReplayLabel?: string;
  children: ReactNode;
}) {
  const tapReplay = Boolean(ttsTapReplayEnabled && onTtsReplay);
  const onRowKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!tapReplay) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTtsReplay?.();
    }
  };
  return (
    <div
      className={cn(
        "flex max-w-[min(100%,20.5rem)] items-start gap-1.5",
        ttsActive && "coach-tts-speaking-row",
        tapReplay &&
          "cursor-pointer rounded-xl px-0.5 py-0.5 -mx-0.5 -my-0.5 transition-[opacity,background-color] active:opacity-[0.88] hover:bg-muted/35"
      )}
      role={tapReplay ? "button" : undefined}
      tabIndex={tapReplay ? 0 : undefined}
      aria-label={tapReplay ? (ttsReplayLabel ?? "이 말 다시 듣기") : undefined}
      onClick={
        tapReplay
          ? (e) => {
              e.preventDefault();
              onTtsReplay?.();
            }
          : undefined
      }
      onKeyDown={onRowKeyDown}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-[15px] transition-[filter,transform] duration-200",
          avatarClass,
          ttsActive && speakingAccent?.emoji
        )}
        aria-hidden
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 max-w-[16.5rem] truncate pl-0.5 text-[11px] font-medium text-muted-foreground">
          {displayName}
        </p>
        <IncomingBubble
          showTail
          bubbleVariant={bubbleVariant}
          isPending={bubblePending}
          speakingBubbleClass={ttsActive ? speakingAccent?.bubble : undefined}
        >
          {children}
        </IncomingBubble>
      </div>
      <span className="mt-7 shrink-0 self-start text-[10px] tabular-nums text-muted-foreground">
        {timeLabel}
      </span>
    </div>
  );
}

function IncomingBubble({
  children,
  showTail,
  isPending,
  bubbleVariant = "default",
  speakingBubbleClass,
}: {
  children: ReactNode;
  showTail: boolean;
  isPending?: boolean;
  bubbleVariant?: "default" | "mission";
  speakingBubbleClass?: string;
}) {
  const isMission = bubbleVariant === "mission";
  return (
    <div
      className={cn(
        "relative max-w-[min(100%,18rem)] rounded-[14px] border px-3 py-2 text-[13px] leading-snug shadow-sm transition-[box-shadow,ring-color] duration-200",
        isMission
          ? cn(
              "border-2 border-amber-500/55 bg-amber-50 text-foreground",
              "ring-1 ring-amber-500/25 dark:border-amber-400/50 dark:bg-amber-950/40 dark:text-amber-50"
            )
          : cn(
              "border-border bg-card text-foreground",
              "dark:border-white/12 dark:bg-zinc-100 dark:text-zinc-900"
            ),
        isPending && "border-dashed opacity-95",
        speakingBubbleClass,
        showTail &&
          (isMission
            ? "before:pointer-events-none before:absolute before:left-[-7px] before:top-[11px] before:h-0 before:w-0 before:border-y-[6px] before:border-r-[8px] before:border-y-transparent before:border-r-amber-50 dark:before:border-r-amber-950/95"
            : "before:pointer-events-none before:absolute before:left-[-7px] before:top-[11px] before:h-0 before:w-0 before:border-y-[6px] before:border-r-[8px] before:border-y-transparent before:border-r-card dark:before:border-r-zinc-100")
      )}
    >
      {children}
    </div>
  );
}

function streamRowSpeakingAccent(
  head: CoachStreamSegment,
  leadPersonaId: CoachPersonaId
): CoachTtsVisualAccent | undefined {
  if (head.tag === "ANALYSIS") return TTS_ANALYSIS_VISUAL;
  if (head.tag === "MISSION") return TTS_MISSION_VISUAL;
  const pid = COACH_TAG_TO_PERSONA[head.tag];
  if (pid) return COACH_TTS_VISUAL[pid];
  return COACH_TTS_VISUAL[leadPersonaId];
}

/** 스트리밍 단톡 세그먼트 — 카카오톡 수신 말풍선 레이아웃 */
export function KakaoDelimitedCoachStream({
  segments,
  receivedAt,
  leadPersonaId = DEFAULT_COACH_PERSONA_ID,
  ttsFocusSegment = null,
  ttsTapReplayEnabled = false,
  onTtsReplaySegment,
}: {
  segments: CoachStreamSegment[];
  receivedAt: Date;
  leadPersonaId?: CoachPersonaId;
  /** TTS가 읽는 행 — `stream:g:${그룹인덱스}` */
  ttsFocusSegment?: string | null;
  ttsTapReplayEnabled?: boolean;
  onTtsReplaySegment?: (focusKey: string) => void;
}) {
  const timeLabel = formatKoreanChatTime(receivedAt);
  const filtered = useMemo(
    () => filterDelimitedSegmentsForInvites(segments, leadPersonaId),
    [segments, leadPersonaId]
  );
  const groups = useMemo(() => groupCoachStreamSegments(filtered), [filtered]);

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const head = group[0];
        if (!head) return null;
        if (head.tag === "QUICK_CHIPS" || head.tag === "DATA_CARD") {
          return null;
        }
        if (head.tag === "INVITE") {
          const code = head.text.trim().toUpperCase();
          const pid = COACH_TAG_TO_PERSONA[code as CoachDelimTag];
          const title = pid ? interventionCodename(pid) : code;
          const emoji = pid ? coachMeta(pid).emoji : "📣";
          return (
            <div
              key={`inv-${gi}-${code}`}
              className="flex justify-center py-0.5"
            >
              <div className="rounded-full border border-dashed border-primary/35 bg-primary/10 px-3 py-1.5 text-center dark:bg-primary/15">
                <p className="text-[10px] font-medium text-foreground">
                  <span aria-hidden>{emoji}</span> 시스템 ·{" "}
                  <span className="font-mono">{title}</span>님이 대화에 참여했습니다
                </p>
              </div>
            </div>
          );
        }

        const meta = rowMetaForFirst(head);
        const isMission = head.tag === "MISSION";
        const bubbleVar = isMission ? "mission" : "default";
        const combined = group.map((s) => s.text).join("\n");
        const groupComplete = group.every((s) => s.complete);
        const hasText = combined.trim().length > 0;
        const showWaitLabel = !hasText && !groupComplete;
        const streamFocusKey = `stream:g:${gi}`;
        const ttsActive = ttsFocusSegment === streamFocusKey;

        return (
          <SingleKakaoCoachRow
            key={`grp-${gi}`}
            displayName={meta.displayName}
            emoji={meta.emoji}
            avatarClass={meta.avatarClass}
            timeLabel={timeLabel}
            bubbleVariant={bubbleVar}
            bubblePending={!groupComplete}
            ttsActive={ttsActive}
            speakingAccent={streamRowSpeakingAccent(head, leadPersonaId)}
            ttsTapReplayEnabled={ttsTapReplayEnabled}
            onTtsReplay={
              onTtsReplaySegment
                ? () => onTtsReplaySegment(streamFocusKey)
                : undefined
            }
            ttsReplayLabel={`${meta.displayName} 다시 듣기`}
          >
            <span className="whitespace-pre-wrap break-words">
              {showWaitLabel ? (
                <span className="text-[12px] text-muted-foreground">
                  입력 대기중
                </span>
              ) : (
                formatInlineBold(combined, "bubble")
              )}
            </span>
          </SingleKakaoCoachRow>
        );
      })}
    </div>
  );
}

export const KakaoOpeningCoachMessage = memo(function KakaoOpeningCoachMessage({
  text,
  coachId,
  receivedAt,
  ttsTapReplayEnabled = false,
  onTtsReplay,
}: {
  text: string;
  coachId: CoachPersonaId;
  receivedAt: Date;
  ttsTapReplayEnabled?: boolean;
  onTtsReplay?: () => void;
}) {
  const m = coachMeta(coachId);
  const timeLabel = formatKoreanChatTime(receivedAt);
  return (
    <SingleKakaoCoachRow
      displayName={`${m.label} 코치`}
      emoji={m.emoji}
      avatarClass={COACH_AVATAR_SURFACE[coachId]}
      timeLabel={timeLabel}
      ttsTapReplayEnabled={ttsTapReplayEnabled}
      onTtsReplay={onTtsReplay}
      ttsReplayLabel={`${m.label} 코치 인사 다시 듣기`}
    >
      <CoachTypewriter text={text} enabled msPerGrapheme={TYPE_MS}>
        {(vis) => (
          <span className="whitespace-pre-wrap break-words">
            {formatInlineBold(vis, "bubble")}
          </span>
        )}
      </CoachTypewriter>
    </SingleKakaoCoachRow>
  );
});

export const KakaoStrategicTurnView = memo(function KakaoStrategicTurnView({
  turn,
  receivedAt,
  ttsFocusSegment = null,
  primaryCoachId = DEFAULT_COACH_PERSONA_ID,
  ttsTapReplayEnabled = false,
  onTtsReplaySegment,
}: {
  turn: CoachStrategicTurn;
  receivedAt: Date;
  /** 이 메시지 안에서 TTS가 읽는 말풍선 (`analysis` | `quip:0` | …) */
  ttsFocusSegment?: string | null;
  /** 로스트 단독 행·분석·미션 보이스 기준 코치 */
  primaryCoachId?: CoachPersonaId;
  /** TTS ON일 때 말풍선 탭 → 해당 구간만 재생 */
  ttsTapReplayEnabled?: boolean;
  onTtsReplaySegment?: (focusKey: string) => void;
}) {
  const timeLabel = formatKoreanChatTime(receivedAt);
  const quips = activeCoachQuips(turn);
  const showQuipGroup = quips.length > 0;
  const hasRoast = Boolean(!showQuipGroup && turn.roast?.trim());

  const typingScheduleKey = [
    turn.analysis,
    turn.mission,
    turn.roast,
    showQuipGroup ? quips.map((q) => `${q.persona_id}:${q.zinger}`).join("\x1e") : "",
  ].join("\x1f");

  /* typingScheduleKey에 quips·문장 전부 반영 → deps 단일화 */
  const { analysisStart, quipStarts, missionStart } = useMemo(() => {
    let t = 0;
    const aStart = t;
    t +=
      countCoachGraphemes(turn.analysis ?? "") * TYPE_MS + GROUP_GAP_MS;
    const starts: number[] = [];
    if (showQuipGroup) {
      for (const q of quips) {
        starts.push(t);
        t +=
          countCoachGraphemes(q.zinger ?? "") * TYPE_MS + GROUP_GAP_MS;
      }
    } else if (hasRoast) {
      starts.push(t);
      t +=
        countCoachGraphemes(turn.roast?.trim() ?? "") * TYPE_MS +
        GROUP_GAP_MS;
    }
    const mStart = t;
    return {
      analysisStart: aStart,
      quipStarts: starts,
      missionStart: mStart,
    };
  }, [typingScheduleKey]);

  return (
    <div className="space-y-3">
      <SingleKakaoCoachRow
        displayName="전술 요약"
        emoji="📋"
        avatarClass="bg-gradient-to-br from-slate-600 to-zinc-800 ring-2 ring-indigo-500/40 shadow-md shadow-black/20"
        timeLabel={timeLabel}
        ttsActive={ttsFocusSegment === "analysis"}
        speakingAccent={TTS_ANALYSIS_VISUAL}
        ttsTapReplayEnabled={ttsTapReplayEnabled}
        onTtsReplay={
          onTtsReplaySegment
            ? () => onTtsReplaySegment("analysis")
            : undefined
        }
        ttsReplayLabel="전술 요약 다시 듣기"
      >
        <CoachTypewriter
          text={turn.analysis}
          enabled
          startDelayMs={analysisStart}
          msPerGrapheme={TYPE_MS}
        >
          {(vis) => (
            <span className="whitespace-pre-wrap break-words">
              {formatInlineBold(vis, "bubble")}
            </span>
          )}
        </CoachTypewriter>
      </SingleKakaoCoachRow>

      {showQuipGroup ? (
        <>
          {quips.map((q, idx) => {
            const m = coachMeta(q.persona_id);
            const start = quipStarts[idx] ?? 0;
            const qKey = `quip:${idx}`;
            return (
              <SingleKakaoCoachRow
                key={`${q.persona_id}-${idx}`}
                displayName={`${m.label} 코치`}
                emoji={m.emoji}
                avatarClass={COACH_AVATAR_SURFACE[q.persona_id]}
                timeLabel={timeLabel}
                ttsActive={ttsFocusSegment === qKey}
                speakingAccent={COACH_TTS_VISUAL[q.persona_id]}
                ttsTapReplayEnabled={ttsTapReplayEnabled}
                onTtsReplay={
                  onTtsReplaySegment
                    ? () => onTtsReplaySegment(qKey)
                    : undefined
                }
                ttsReplayLabel={`${m.label} 코치 말 다시 듣기`}
              >
                <CoachTypewriter
                  text={q.zinger}
                  enabled
                  startDelayMs={start}
                  msPerGrapheme={TYPE_MS}
                >
                  {(vis) => (
                    <span className="whitespace-pre-wrap break-words italic">
                      {formatInlineBold(vis, "roast")}
                    </span>
                  )}
                </CoachTypewriter>
              </SingleKakaoCoachRow>
            );
          })}
        </>
      ) : hasRoast ? (
        <SingleKakaoCoachRow
          displayName={`${coachMeta(primaryCoachId).label} 코치`}
          emoji={coachMeta(primaryCoachId).emoji}
          avatarClass={COACH_AVATAR_SURFACE[primaryCoachId]}
          timeLabel={timeLabel}
          ttsActive={ttsFocusSegment === "roast"}
          speakingAccent={COACH_TTS_VISUAL[primaryCoachId]}
          ttsTapReplayEnabled={ttsTapReplayEnabled}
          onTtsReplay={
            onTtsReplaySegment
              ? () => onTtsReplaySegment("roast")
              : undefined
          }
          ttsReplayLabel={`${coachMeta(primaryCoachId).label} 코치 말 다시 듣기`}
        >
          <CoachTypewriter
            text={turn.roast!.trim()}
            enabled
            startDelayMs={quipStarts[0] ?? 0}
            msPerGrapheme={TYPE_MS}
          >
            {(vis) => (
              <span className="whitespace-pre-wrap break-words italic">
                {formatInlineBold(vis, "roast")}
              </span>
            )}
          </CoachTypewriter>
        </SingleKakaoCoachRow>
      ) : null}

      <SingleKakaoCoachRow
        displayName="미션"
        emoji="🎯"
        avatarClass="bg-gradient-to-br from-teal-700 to-teal-950 ring-2 ring-violet-500/35 shadow-md shadow-black/20"
        timeLabel={timeLabel}
        bubbleVariant="mission"
        ttsActive={ttsFocusSegment === "mission"}
        speakingAccent={TTS_MISSION_VISUAL}
        ttsTapReplayEnabled={ttsTapReplayEnabled}
        onTtsReplay={
          onTtsReplaySegment
            ? () => onTtsReplaySegment("mission")
            : undefined
        }
        ttsReplayLabel="미션 다시 듣기"
      >
        <CoachTypewriter
          text={turn.mission}
          enabled
          startDelayMs={missionStart}
          msPerGrapheme={TYPE_MS}
        >
          {(vis) => (
            <span className="whitespace-pre-wrap break-words">
              {formatInlineBold(vis, "bubble")}
            </span>
          )}
        </CoachTypewriter>
      </SingleKakaoCoachRow>
    </div>
  );
});

export { formatInlineBold, COACH_TAG_TO_PERSONA };
