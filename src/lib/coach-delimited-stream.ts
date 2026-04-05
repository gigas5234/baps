import {
  emptyDataCard,
  normalizeCoachReply,
  type CoachChatReply,
  type CoachQuip,
  type DataCardPayload,
  type QuickChip,
} from "@/lib/chat-coach";
import type { CoachPersonaId } from "@/lib/coach-personas";

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

/** 누적 스트링 → 태그 구간 (마지막 블록은 complete=false 가능) */
export function parseCoachDelimitedStream(
  raw: string,
  streamFinished: boolean
): { segments: CoachStreamSegment[] } {
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
export function delimitedStreamToCoachChatReply(raw: string): CoachChatReply {
  const { segments } = parseCoachDelimitedStream(raw, true);
  let analysis = "";
  let mission = "";
  const coach_quips: CoachQuip[] = [];
  let data_card: DataCardPayload = emptyDataCard();
  let quick_chips: QuickChip[] = [];

  for (const { tag, text } of segments) {
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
