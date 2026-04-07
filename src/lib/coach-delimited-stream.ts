import {
  emptyDataCard,
  normalizeCoachReply,
  type CoachChatReply,
  type CoachQuip,
  type DataCardPayload,
  type QuickChip,
} from "@/lib/chat-coach";
import {
  COACH_STREAM_FALLBACK_MESSAGE,
  coachStreamIsCorruptLeak,
} from "@/lib/coach-stream-guard";
import {
  type CoachPersonaId,
  DEFAULT_COACH_PERSONA_ID,
} from "@/lib/coach-personas";

const DELIM_RE =
  /\[(ANALYSIS|MISSION|INVITE|DIET|NUTRITION|EXERCISE|MENTAL|ROI|QUICK_CHIPS|DATA_CARD)\]/gi;

export type CoachDelimTag =
  | "ANALYSIS"
  | "MISSION"
  | "INVITE"
  | "DIET"
  | "NUTRITION"
  | "EXERCISE"
  | "MENTAL"
  | "ROI"
  | "QUICK_CHIPS"
  | "DATA_CARD";

export type CoachStreamSegment = {
  tag: CoachDelimTag;
  text: string;
  complete: boolean;
};

const TAG_TO_PERSONA: Partial<Record<CoachDelimTag, CoachPersonaId>> = {
  DIET: "diet",
  NUTRITION: "nutrition",
  EXERCISE: "exercise",
  MENTAL: "mental",
  ROI: "roi",
};

/** 스트림 태그 → 코치 ID (단톡 TTS·UI 공통) */
export const COACH_DELIM_TAG_TO_PERSONA: Partial<
  Record<CoachDelimTag, CoachPersonaId>
> = TAG_TO_PERSONA;

/** `KakaoDelimitedCoachStream` 그룹핑 — 연속 구간을 말풍선 단위로 묶음 */
export function coachStreamVisualGroupKey(seg: CoachStreamSegment): string {
  if (seg.tag === "INVITE") return `invite:${seg.text.trim().toUpperCase()}`;
  if (seg.tag === "ANALYSIS") return "analysis";
  if (seg.tag === "MISSION") return "mission";
  if (seg.tag === "QUICK_CHIPS" || seg.tag === "DATA_CARD")
    return `meta:${seg.tag}`;
  const pid = TAG_TO_PERSONA[seg.tag];
  return pid ?? seg.tag;
}

export function groupCoachStreamSegments(
  segments: CoachStreamSegment[]
): CoachStreamSegment[][] {
  const groups: CoachStreamSegment[][] = [];
  let cur: CoachStreamSegment[] = [];
  let prev: string | null = null;

  for (const seg of segments) {
    const k = coachStreamVisualGroupKey(seg);
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

const PERSONA_TO_DELIM: Record<CoachPersonaId, CoachDelimTag> = {
  diet: "DIET",
  nutrition: "NUTRITION",
  exercise: "EXERCISE",
  mental: "MENTAL",
  roi: "ROI",
};

/**
 * [INVITE] 가 하나라도 있으면: 난입으로 초대된 코치 태그 + 1:1 리드 코치 태그만 말풍선으로 남긴다.
 * (모델이 [코치 3명] 규칙 때문에 초대받지 않은 코치도 말하는 경우 UI에서 제거)
 */
export function filterDelimitedSegmentsForInvites(
  segments: CoachStreamSegment[],
  leadPersonaId: CoachPersonaId
): CoachStreamSegment[] {
  const invited = new Set<CoachDelimTag>();
  for (const s of segments) {
    if (s.tag !== "INVITE") continue;
    const code = s.text.trim().toUpperCase() as CoachDelimTag;
    if (TAG_TO_PERSONA[code]) invited.add(code);
  }
  if (invited.size === 0) return segments;

  const leadTag = PERSONA_TO_DELIM[leadPersonaId] ?? "DIET";
  return segments.filter((s) => {
    if (
      s.tag === "ANALYSIS" ||
      s.tag === "MISSION" ||
      s.tag === "INVITE" ||
      s.tag === "QUICK_CHIPS" ||
      s.tag === "DATA_CARD"
    ) {
      return true;
    }
    if (!TAG_TO_PERSONA[s.tag]) return true;
    return invited.has(s.tag) || s.tag === leadTag;
  });
}

export function buildStreamCorruptFallbackReply(): CoachChatReply {
  return {
    analysis: COACH_STREAM_FALLBACK_MESSAGE,
    roast: "",
    mission: "같은 메시지를 한 번 더 보내보세요.",
    coach_quips: [],
    data_card: emptyDataCard(),
    quick_chips: [],
  };
}

/** 누적 스트링 → 태그 구간 (마지막 블록은 complete=false 가능) */
export function parseCoachDelimitedStream(
  raw: string,
  streamFinished: boolean
): { segments: CoachStreamSegment[] } {
  if (coachStreamIsCorruptLeak(raw, streamFinished)) {
    return {
      segments: [
        {
          tag: "ANALYSIS",
          text: COACH_STREAM_FALLBACK_MESSAGE,
          complete: streamFinished,
        },
      ],
    };
  }

  const matches = [...raw.matchAll(DELIM_RE)];
  if (matches.length === 0) {
    if (!raw.trim()) return { segments: [] };
    return {
      segments: [
        {
          tag: "ANALYSIS",
          text: raw.trim(),
          complete: streamFinished,
        },
      ],
    };
  }

  const segments: CoachStreamSegment[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const tag = m[1].toUpperCase() as CoachDelimTag;
    const start = m.index! + m[0].length;
    const end =
      i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const text = raw.slice(start, end).trim();
    const isLast = i === matches.length - 1;
    segments.push({
      tag,
      text,
      complete: !isLast || streamFinished,
    });
  }
  return { segments };
}

function parseQuickChipsJson(s: string): QuickChip[] {
  const t = s.trim();
  if (!t) return [];
  try {
    const parsed = JSON.parse(t) as unknown;
    return Array.isArray(parsed)
      ? (parsed as QuickChip[]).slice(0, 5)
      : [];
  } catch {
    return [];
  }
}

function parseDataCardJson(s: string): DataCardPayload | null {
  const t = s.trim();
  if (!t) return null;
  try {
    const parsed = JSON.parse(t) as DataCardPayload;
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

/** 스트림 완료 후 단일 객체로 병합 → 기존 UI·normalizeCoachReply와 호환 */
export function delimitedStreamToCoachChatReply(
  raw: string,
  leadPersonaId: CoachPersonaId = DEFAULT_COACH_PERSONA_ID
): CoachChatReply {
  if (coachStreamIsCorruptLeak(raw, true)) {
    return buildStreamCorruptFallbackReply();
  }

  const { segments } = parseCoachDelimitedStream(raw, true);
  const segmentsFiltered = filterDelimitedSegmentsForInvites(
    segments,
    leadPersonaId
  );
  let analysis = "";
  let mission = "";
  const coach_quips: CoachQuip[] = [];
  let data_card: DataCardPayload = emptyDataCard();
  let quick_chips: QuickChip[] = [];

  for (const { tag, text } of segmentsFiltered) {
    if (tag === "ANALYSIS") {
      analysis = text;
      continue;
    }
    if (tag === "MISSION") {
      mission = text;
      continue;
    }
    if (tag === "QUICK_CHIPS") {
      quick_chips = parseQuickChipsJson(text).slice(0, 3);
      continue;
    }
    if (tag === "DATA_CARD") {
      const card = parseDataCardJson(text);
      if (card) data_card = card;
      continue;
    }
    const pid = TAG_TO_PERSONA[tag];
    if (pid && text) {
      coach_quips.push({ persona_id: pid, zinger: text });
    }
  }

  return normalizeCoachReply({
    analysis,
    mission,
    roast: "",
    coach_quips,
    data_card,
    quick_chips,
  });
}
