import { plainCoachTextForTts } from "@/lib/chat-coach";
import {
  COACH_DELIM_TAG_TO_PERSONA,
  type CoachDelimTag,
  type CoachStreamSegment,
} from "@/lib/coach-delimited-stream";
import type { CoachPersonaId } from "@/lib/coach-personas";

export type StreamTtsChunk = {
  text: string;
  coachId: CoachPersonaId;
};

type PerSeg = {
  carry: string;
  /** 이전 feed까지 반영된 seg.text 길이 */
  lastLen: number;
  coachId: CoachPersonaId;
};

function coachIdForTag(
  tag: CoachDelimTag,
  lead: CoachPersonaId
): CoachPersonaId | null {
  if (tag === "ANALYSIS" || tag === "MISSION") return lead;
  if (
    tag === "INVITE" ||
    tag === "QUICK_CHIPS" ||
    tag === "DATA_CARD"
  ) {
    return null;
  }
  return COACH_DELIM_TAG_TO_PERSONA[tag] ?? null;
}

/** 마침표 없이 길어진 구어체용: 이 길이 이상이면 쉼표·이모지·하드 컷 시도 */
const SOFT_FLUSH_MIN_CHARS = 40;

/**
 * 누적 버퍼에서 완결된 문장만 추출. 구분: 줄바꿈, 또는 .!? 뒤 공백/끝 (3.14 등은 제외)
 */
export function extractCompleteSentencesFromCarry(buffer: string): {
  sentences: string[];
  rest: string;
} {
  const sentences: string[] = [];
  let restStart = 0;
  let i = 0;
  while (i < buffer.length) {
    const ch = buffer[i]!;
    if (ch === "\n") {
      const block = buffer.slice(restStart, i).trim();
      if (block) sentences.push(block);
      i++;
      restStart = i;
      continue;
    }
    if (ch === "." || ch === "!" || ch === "?" || ch === "。") {
      const next = buffer[i + 1];
      if (
        next === undefined ||
        next === "\n" ||
        /\s/.test(next)
      ) {
        const block = buffer.slice(restStart, i + 1).trim();
        if (block) sentences.push(block);
        i++;
        while (i < buffer.length && /\s/.test(buffer[i]!)) i++;
        restStart = i;
        continue;
      }
    }
    i++;
  }
  return { sentences, rest: buffer.slice(restStart) };
}

/**
 * `rest`가 SOFT_FLUSH_MIN_CHARS 이상인데 문장 부호가 없을 때:
 * 앞쪽 윈도우에서 **쉼표(,)** 뒤 또는 **이모지(Extended_Pictographic)** 뒤에서 끊고,
 * 없으면 `SOFT_FLUSH_MIN_CHARS`에서 하드 컷(짧고 리드미컬한 TTS 덩어리).
 */
function findSoftBreakAfter(s: string, minLen: number): number | null {
  if (s.length < minLen) return null;
  const cap = Math.min(s.length, minLen + 36);
  for (let i = cap - 1; i >= Math.max(0, minLen - 28); i--) {
    const c = s[i]!;
    if (c === "," || c === "，") {
      return i + 1;
    }
  }
  const head = s.slice(0, cap);
  let lastEmojiEnd = -1;
  const re = /\p{Extended_Pictographic}/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(head)) !== null) {
    const end = m.index + m[0].length;
    if (end >= minLen - 14 && end <= cap) {
      lastEmojiEnd = end;
    }
  }
  if (lastEmojiEnd > 0) return lastEmojiEnd;
  return minLen;
}

export function extractSoftBoundedPreface(buffer: string): {
  chunks: string[];
  rest: string;
} {
  const chunks: string[] = [];
  let work = buffer;
  while (work.length >= SOFT_FLUSH_MIN_CHARS) {
    const idx = findSoftBreakAfter(work, SOFT_FLUSH_MIN_CHARS);
    if (idx === null || idx <= 0) break;
    const head = work.slice(0, idx).trim();
    if (head.length > 0) chunks.push(head);
    const next = work.slice(idx).trimStart();
    if (next.length >= work.length) break;
    work = next;
  }
  return { chunks, rest: work };
}

/** 문장 부호 추출 후, 남은 carry에 길이·쉼표·이모지 기반 선제 끊기 적용 */
function extractSpeakChunksFromCarry(carry: string): {
  chunks: string[];
  rest: string;
} {
  const { sentences, rest } = extractCompleteSentencesFromCarry(carry);
  const soft = extractSoftBoundedPreface(rest);
  return { chunks: [...sentences, ...soft.chunks], rest: soft.rest };
}

/**
 * LLM 스트림(필터된 CoachStreamSegment[])마다 호출 → 문장 단위 TTS 덩어리.
 * 세그먼트가 complete가 되면 carry 잔여를 한 번 더 읽습니다.
 */
export class CoachStreamTtsSentencePipeline {
  private lead: CoachPersonaId;
  private readonly perSeg = new Map<number, PerSeg>();

  constructor(leadPersonaId: CoachPersonaId) {
    this.lead = leadPersonaId;
  }

  setLead(id: CoachPersonaId) {
    this.lead = id;
  }

  reset() {
    this.perSeg.clear();
  }

  /** 한 번의 onDelimitedPreview 호출당 새로 읽을 문장들 */
  feed(segments: CoachStreamSegment[]): StreamTtsChunk[] {
    const out: StreamTtsChunk[] = [];

    segments.forEach((seg, i) => {
      const coachId = coachIdForTag(seg.tag, this.lead);
      if (!coachId) return;

      const text = seg.text ?? "";
      let st = this.perSeg.get(i);
      if (!st || st.coachId !== coachId) {
        st = { carry: "", lastLen: 0, coachId };
      }
      if (text.length < st.lastLen) {
        st = { carry: "", lastLen: 0, coachId };
      }

      const delta = text.slice(st.lastLen);
      st.lastLen = text.length;
      st.carry += delta;

      const { chunks, rest } = extractSpeakChunksFromCarry(st.carry);
      st.carry = rest;

      for (const raw of chunks) {
        const t = plainCoachTextForTts(raw).trim();
        if (t.length > 0) out.push({ text: t, coachId });
      }

      if (seg.complete) {
        const tail = plainCoachTextForTts(st.carry).trim();
        if (tail.length > 0) out.push({ text: tail, coachId });
        st.carry = "";
      }

      this.perSeg.set(i, st);
    });

    return out;
  }
}
