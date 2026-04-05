"use client";

import type { ReactNode } from "react";
import type {
  CoachDelimTag,
  CoachStreamSegment,
} from "@/lib/coach-delimited-stream";
import { formatKoreanChatTime } from "@/lib/coach-chat-time";
import { interventionCodename } from "@/lib/coach-intervention-triggers";
import {
  coachMeta,
  COACH_AVATAR_SURFACE,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import { cn } from "@/lib/utils";
import type { CoachStrategicTurn } from "@/lib/chat-coach";

const COACH_TAG_TO_PERSONA: Partial<Record<CoachDelimTag, CoachPersonaId>> = {
  DIET: "diet",
  NUTRITION: "nutrition",
  EXERCISE: "exercise",
  MENTAL: "mental",
  ROI: "roi",
};

function formatInlineBold(
  text: string,
  variant: "bubble" | "roast" = "bubble"
): ReactNode {
  const strongCls =
    variant === "bubble"
      ? "font-semibold text-zinc-900 tabular-nums"
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

function visualGroupKey(seg: CoachStreamSegment): string {
  if (seg.tag === "INVITE") return `invite:${seg.text.trim().toUpperCase()}`;
  if (seg.tag === "ANALYSIS") return "analysis";
  if (seg.tag === "MISSION") return "mission";
  if (seg.tag === "QUICK_CHIPS" || seg.tag === "DATA_CARD") return `meta:${seg.tag}`;
  const pid = COACH_TAG_TO_PERSONA[seg.tag];
  return pid ?? seg.tag;
}

function groupSegments(segments: CoachStreamSegment[]): CoachStreamSegment[][] {
  const groups: CoachStreamSegment[][] = [];
  let cur: CoachStreamSegment[] = [];
  let prev: string | null = null;

  for (const seg of segments) {
    const k = visualGroupKey(seg);
    if (seg.tag === "QUICK_CHIPS" || seg.tag === "DATA_CARD") {
      if (cur.length) {
        groups.push(cur);
        cur = [];
        prev = null;
      }
      groups.push([seg]);
      continue;
    }
    if (prev !== null && k !== prev) {
      groups.push(cur);
      cur = [];
    }
    cur.push(seg);
    prev = k;
  }
  if (cur.length) groups.push(cur);
  return groups;
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
      displayName: `${m.label} 코치 (냉정)`,
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
  children,
}: {
  displayName: string;
  emoji: string;
  avatarClass: string;
  timeLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-[min(100%,20.5rem)] items-end gap-1.5">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-[15px]",
          avatarClass
        )}
        aria-hidden
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 max-w-[16.5rem] truncate pl-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
          {displayName}
        </p>
        <IncomingBubble showTail>{children}</IncomingBubble>
      </div>
      <span className="mb-1 shrink-0 align-bottom text-[10px] tabular-nums text-zinc-500 dark:text-zinc-500">
        {timeLabel}
      </span>
    </div>
  );
}

function IncomingBubble({
  children,
  showTail,
  isPending,
}: {
  children: ReactNode;
  showTail: boolean;
  isPending?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative max-w-[min(100%,18rem)] rounded-[14px] border border-indigo-500/40",
        "bg-white px-3 py-2 text-[13px] leading-snug text-zinc-900 shadow-sm",
        "dark:border-violet-500/35 dark:bg-zinc-100 dark:text-zinc-900",
        isPending && "border-dashed opacity-95",
        showTail &&
          "before:pointer-events-none before:absolute before:left-[-7px] before:top-[11px] before:h-0 before:w-0 before:border-y-[6px] before:border-r-[8px] before:border-y-transparent before:border-r-white dark:before:border-r-zinc-100"
      )}
    >
      {children}
    </div>
  );
}

function SystemMetaRow({ seg }: { seg: CoachStreamSegment }) {
  const label = seg.tag === "QUICK_CHIPS" ? "추천 질문 동기화" : "데이터 카드";
  return (
    <div className="flex justify-center py-1">
      <p className="rounded-full border border-indigo-500/25 bg-indigo-950/40 px-3 py-1 text-[10px] text-zinc-400">
        {label} · 서식 정리 중…
      </p>
    </div>
  );
}

/** 스트리밍 단톡 세그먼트 — 카카오톡 수신 말풍선 레이아웃 */
export function KakaoDelimitedCoachStream({
  segments,
  receivedAt,
}: {
  segments: CoachStreamSegment[];
  receivedAt: Date;
}) {
  const timeLabel = formatKoreanChatTime(receivedAt);
  const groups = groupSegments(segments);

  return (
    <div className="space-y-3">
      {groups.map((group, gi) => {
        const head = group[0];
        if (!head) return null;
        if (head.tag === "QUICK_CHIPS" || head.tag === "DATA_CARD") {
          return <SystemMetaRow key={`meta-${gi}`} seg={head} />;
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
              <div className="rounded-full border border-dashed border-indigo-500/35 bg-indigo-950/30 px-3 py-1.5 text-center dark:bg-indigo-950/45">
                <p className="text-[10px] font-medium text-indigo-200/90">
                  <span aria-hidden>{emoji}</span> 시스템 ·{" "}
                  <span className="font-mono">{title}</span>님이 대화에 참여했습니다
                </p>
              </div>
            </div>
          );
        }

        const meta = rowMetaForFirst(head);
        return (
          <div
            key={`grp-${gi}`}
            className="flex max-w-[min(100%,20.5rem)] items-end gap-1.5"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full text-[15px]",
                meta.avatarClass
              )}
              aria-hidden
            >
              {meta.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-0.5 max-w-[16.5rem] truncate pl-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                {meta.displayName}
              </p>
              <div className="flex flex-col gap-1">
                {group.map((seg, bi) => (
                  <IncomingBubble
                    key={`${seg.tag}-${gi}-${bi}`}
                    showTail={bi === 0}
                    isPending={bi === group.length - 1 && !seg.complete}
                  >
                    <span className="whitespace-pre-wrap break-words">
                      {seg.text
                        ? formatInlineBold(seg.text, "bubble")
                        : !seg.complete
                          ? "…"
                          : null}
                    </span>
                  </IncomingBubble>
                ))}
              </div>
            </div>
            <span className="mb-1 shrink-0 align-bottom text-[10px] tabular-nums text-zinc-500 dark:text-zinc-500">
              {timeLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function KakaoOpeningCoachMessage({
  text,
  coachId,
  receivedAt,
}: {
  text: string;
  coachId: CoachPersonaId;
  receivedAt: Date;
}) {
  const m = coachMeta(coachId);
  const timeLabel = formatKoreanChatTime(receivedAt);
  return (
    <SingleKakaoCoachRow
      displayName={`${m.label} 코치 (냉정)`}
      emoji={m.emoji}
      avatarClass={COACH_AVATAR_SURFACE[coachId]}
      timeLabel={timeLabel}
    >
      <span className="whitespace-pre-wrap break-words">
        {formatInlineBold(text, "bubble")}
      </span>
    </SingleKakaoCoachRow>
  );
}

export function KakaoStrategicTurnView({
  turn,
  receivedAt,
}: {
  turn: CoachStrategicTurn;
  receivedAt: Date;
}) {
  const timeLabel = formatKoreanChatTime(receivedAt);
  const quips =
    turn.coach_quips?.filter((q) => q.zinger?.trim()) ?? [];
  const showQuipGroup = quips.length > 0;

  return (
    <div className="space-y-3">
      <SingleKakaoCoachRow
        displayName="전술 요약"
        emoji="📋"
        avatarClass="bg-gradient-to-br from-slate-600 to-zinc-800 ring-2 ring-indigo-500/40 shadow-md shadow-black/20"
        timeLabel={timeLabel}
      >
        <span className="whitespace-pre-wrap break-words">
          {formatInlineBold(turn.analysis, "bubble")}
        </span>
      </SingleKakaoCoachRow>

      {showQuipGroup ? (
        <>
          {quips.map((q, idx) => {
            const m = coachMeta(q.persona_id);
            return (
              <SingleKakaoCoachRow
                key={`${q.persona_id}-${idx}`}
                displayName={`${m.label} 코치 (냉정)`}
                emoji={m.emoji}
                avatarClass={COACH_AVATAR_SURFACE[q.persona_id]}
                timeLabel={timeLabel}
              >
                <span className="whitespace-pre-wrap break-words italic">
                  {formatInlineBold(q.zinger, "roast")}
                </span>
              </SingleKakaoCoachRow>
            );
          })}
        </>
      ) : turn.roast?.trim() ? (
        <SingleKakaoCoachRow
          displayName={`${coachMeta("diet").label} 코치 (냉정)`}
          emoji={coachMeta("diet").emoji}
          avatarClass={COACH_AVATAR_SURFACE.diet}
          timeLabel={timeLabel}
        >
          <span className="whitespace-pre-wrap break-words italic">
            {formatInlineBold(turn.roast, "roast")}
          </span>
        </SingleKakaoCoachRow>
      ) : null}

      <SingleKakaoCoachRow
        displayName="미션"
        emoji="🎯"
        avatarClass="bg-gradient-to-br from-teal-700 to-teal-950 ring-2 ring-violet-500/35 shadow-md shadow-black/20"
        timeLabel={timeLabel}
      >
        <span className="whitespace-pre-wrap break-words">
          {formatInlineBold(turn.mission, "bubble")}
        </span>
      </SingleKakaoCoachRow>
    </div>
  );
}

export { formatInlineBold, COACH_TAG_TO_PERSONA };
