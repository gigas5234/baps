"use client";

import {
  coachTurnTtsSegments,
  type CoachStrategicTurn,
} from "@/lib/chat-coach";
import type { CoachPersonaId } from "@/lib/coach-personas";

const MAX_LEN = 4000;

let activeAudio: HTMLAudioElement | null = null;

export function stopCoachNeuralTtsPlayback(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load();
    activeAudio = null;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

/**
 * 선택된 코치의 Azure Neural 보이스로 문장을 읽습니다.
 * `chatTtsEnabled` 등 UI 토글과 함께 호출하세요.
 */
export async function playCoachNeuralTts(
  text: string,
  coachId: CoachPersonaId,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const t = text.trim();
  if (!t) return;
  if (options?.signal?.aborted) return;

  const res = await fetch("/api/speech/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: t.slice(0, MAX_LEN), coachId }),
    signal: options?.signal,
  });

  if (!res.ok) {
    const raw: unknown = await res.json().catch(() => ({}));
    const msg =
      typeof raw === "object" &&
      raw !== null &&
      "error" in raw &&
      typeof (raw as { error: unknown }).error === "string"
        ? (raw as { error: string }).error
        : "음성 합성에 실패했어요.";
    throw new Error(msg);
  }

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio(objectUrl);
  activeAudio = audio;

  try {
    await new Promise<void>((resolve, reject) => {
      const signal = options?.signal;

      const cleanupAbort = () => {
        signal?.removeEventListener("abort", onAbort);
      };

      const onAbort = () => {
        audio.pause();
        cleanupAbort();
        reject(new DOMException("Aborted", "AbortError"));
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      audio.onended = () => {
        cleanupAbort();
        resolve();
      };

      audio.onerror = () => {
        cleanupAbort();
        reject(new Error("오디오를 재생하지 못했어요."));
      };

      void audio.play().catch((err) => {
        cleanupAbort();
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  } finally {
    if (activeAudio === audio) activeAudio = null;
    URL.revokeObjectURL(objectUrl);
  }
}

export type PlayCoachTurnTtsOptions = {
  signal?: AbortSignal;
  /** 화자(`coachId`)가 바뀔 때만 적용되는 무음(ms). 기본 1500 */
  pauseBetweenSpeakersMs?: number;
  onSegmentFocus?: (focusKey: string) => void;
  onSegmentBlur?: () => void;
  /** 화자 전환 대기(쉼표) 구간 — UI "교신 중" 등 */
  onInterSpeakerBridge?: (active: boolean) => void;
  /**
   * 세그먼트 시작 전마다 호출. false면 루프·쉼 타이머를 중단하고 종료.
   * (토글 OFF가 useEffect보다 빨리 반영돼야 할 때 ref 기반)
   */
  shouldContinue?: () => boolean;
};

/** 턴을 구간별로 나눠 코치별 Neural 보이스로 순서대로 재생합니다. */
export async function playCoachTurnNeuralTts(
  turn: CoachStrategicTurn,
  primaryCoach: CoachPersonaId,
  options?: PlayCoachTurnTtsOptions
): Promise<void> {
  const segs = coachTurnTtsSegments(turn, primaryCoach);
  const pauseMs = options?.pauseBetweenSpeakersMs ?? 1500;
  const signal = options?.signal;

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!;
    if (signal?.aborted) return;
    if (options?.shouldContinue && !options.shouldContinue()) {
      options?.onInterSpeakerBridge?.(false);
      options?.onSegmentBlur?.();
      return;
    }

    if (i > 0 && seg.coachId !== segs[i - 1]!.coachId) {
      options?.onSegmentBlur?.();
      options?.onInterSpeakerBridge?.(true);
      try {
        await sleep(pauseMs, signal);
      } catch (e) {
        options?.onInterSpeakerBridge?.(false);
        if (isAbortError(e)) return;
        throw e;
      }
      options?.onInterSpeakerBridge?.(false);
    }

    if (options?.shouldContinue && !options.shouldContinue()) {
      options?.onSegmentBlur?.();
      return;
    }

    options?.onSegmentFocus?.(seg.focusKey);
    try {
      await playCoachNeuralTts(seg.text, seg.coachId, { signal });
    } catch (e) {
      options?.onInterSpeakerBridge?.(false);
      options?.onSegmentBlur?.();
      if (isAbortError(e)) return;
      return;
    }
  }
  options?.onSegmentBlur?.();
}
