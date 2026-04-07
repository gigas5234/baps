import {
  plainCoachTextForTts,
  type CoachTurnTtsSegment,
} from "@/lib/chat-coach";
import {
  COACH_DELIM_TAG_TO_PERSONA,
  filterDelimitedSegmentsForInvites,
  groupCoachStreamSegments,
  type CoachStreamSegment,
} from "@/lib/coach-delimited-stream";
import type { CoachPersonaId } from "@/lib/coach-personas";

/**
 * 스트림 말풍선 그룹 순서(`groupCoachStreamSegments`)와 동일한 TTS 구간.
 * `focusKey`는 렌더 시각 그룹 인덱스와 맞춤 (`stream:g:${gi}`).
 */
export function coachStreamTtsSegments(
  segments: CoachStreamSegment[],
  leadPersona: CoachPersonaId
): CoachTurnTtsSegment[] {
  const filtered = filterDelimitedSegmentsForInvites(segments, leadPersona);
  const groups = groupCoachStreamSegments(filtered);
  const out: CoachTurnTtsSegment[] = [];

  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    const head = group[0];
    if (!head) continue;
    if (
      head.tag === "INVITE" ||
      head.tag === "QUICK_CHIPS" ||
      head.tag === "DATA_CARD"
    ) {
      continue;
    }

    const combined = group.map((s) => s.text).join("\n").trim();
    if (!combined) continue;

    let coachId: CoachPersonaId = leadPersona;
    if (head.tag === "ANALYSIS" || head.tag === "MISSION") {
      coachId = leadPersona;
    } else {
      const p = COACH_DELIM_TAG_TO_PERSONA[head.tag];
      if (!p) continue;
      coachId = p;
    }

    const t = plainCoachTextForTts(combined);
    if (t) out.push({ text: t, coachId, focusKey: `stream:g:${gi}` });
  }
  return out;
}

export function coachStreamSegmentForReplay(
  segments: CoachStreamSegment[],
  leadPersona: CoachPersonaId,
  focusKey: string
): CoachTurnTtsSegment | null {
  return (
    coachStreamTtsSegments(segments, leadPersona).find(
      (s) => s.focusKey === focusKey
    ) ?? null
  );
}
