"use client";

import {
  coachTurnTtsSegments,
  type CoachStrategicTurn,
} from "@/lib/chat-coach";
import { buildCoachNeuralSsml } from "@/lib/azure-speech-ssml";
import { coachStreamTtsSegments } from "@/lib/coach-stream-tts";
import type { CoachStreamSegment } from "@/lib/coach-delimited-stream";
import {
  coachNeuralTts,
  type CoachPersonaId,
} from "@/lib/coach-personas";
import {
  coachTtsGetActiveAudio,
  coachTtsRegisterActiveDispose,
  coachTtsSetActiveAudio,
} from "@/lib/coach-tts-playback";

const MAX_LEN = 4000;

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
 * `/api/speech/token` + 브라우저 Speech SDK로 **클라이언트 직접 합성**(서버 MP3 왕복 없음).
 * 토큰/SDK 실패 시에만 서버 `/api/speech/tts`로 폴백합니다.
 */
export async function playCoachNeuralTts(
  text: string,
  coachId: CoachPersonaId,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const t = text.trim();
  if (!t) return;
  if (options?.signal?.aborted) return;

  try {
    await playCoachNeuralTtsWithBrowserSdk(t, coachId, options);
  } catch (e) {
    if (isAbortError(e)) throw e;
    if (process.env.NODE_ENV === "development" && e instanceof Error) {
      console.warn("[BAPS TTS] 클라이언트 합성 실패 → 서버 폴백:", e.message);
    }
    await playCoachNeuralTtsServerMp3(t, coachId, options);
  }
}

async function playCoachNeuralTtsWithBrowserSdk(
  t: string,
  coachId: CoachPersonaId,
  options?: { signal?: AbortSignal }
): Promise<void> {
  const signal = options?.signal;
  if (signal?.aborted) return;

  const SpeechSDK = await import("microsoft-cognitiveservices-speech-sdk");

  const tokenRes = await fetch("/api/speech/token", { signal });
  const raw: unknown = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    const msg =
      typeof raw === "object" &&
      raw !== null &&
      "error" in raw &&
      typeof (raw as { error: unknown }).error === "string"
        ? (raw as { error: string }).error
        : "음성 토큰을 불러오지 못했어요.";
    throw new Error(msg);
  }
  if (
    typeof raw !== "object" ||
    raw === null ||
    typeof (raw as { token?: unknown }).token !== "string" ||
    typeof (raw as { region?: unknown }).region !== "string"
  ) {
    throw new Error("토큰 응답 형식이 올바르지 않아요.");
  }
  const { token, region } = raw as { token: string; region: string };

  const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
    token,
    region
  );
  const { voiceName, prosodyRate } = coachNeuralTts(coachId);
  speechConfig.speechSynthesisVoiceName = voiceName;

  const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
  const synthesizer = new SpeechSDK.SpeechSynthesizer(
    speechConfig,
    audioConfig
  );

  const ssml = buildCoachNeuralSsml(
    t.slice(0, MAX_LEN),
    voiceName,
    prosodyRate
  );

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try {
      synthesizer.close();
    } catch {
      /* 이미 닫힘 */
    }
    coachTtsRegisterActiveDispose(null);
  };

  coachTtsRegisterActiveDispose(dispose);

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        dispose();
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          signal?.removeEventListener("abort", onAbort);
          if (signal?.aborted) {
            dispose();
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          if (result.reason === SpeechSDK.ResultReason.Canceled) {
            dispose();
            reject(
              signal?.aborted
                ? new DOMException("Aborted", "AbortError")
                : new Error(
                    result.errorDetails?.trim() || "음성 합성이 취소되었어요."
                  )
            );
            return;
          }
          if (
            result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
          ) {
            dispose();
            resolve();
            return;
          }
          const detail =
            result.errorDetails?.trim() || "음성 합성에 실패했어요.";
          dispose();
          reject(new Error(detail));
        },
        (err: string) => {
          signal?.removeEventListener("abort", onAbort);
          dispose();
          reject(new Error(String(err)));
        }
      );
    });
  } catch (e) {
    dispose();
    throw e;
  }
}

/** 레거시: 서버 REST TTS → MP3 blob 재생 (폴백 전용) */
async function playCoachNeuralTtsServerMp3(
  t: string,
  coachId: CoachPersonaId,
  options?: { signal?: AbortSignal }
): Promise<void> {
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
  coachTtsSetActiveAudio(audio);

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
    if (coachTtsGetActiveAudio() === audio) {
      coachTtsSetActiveAudio(null);
    }
    URL.revokeObjectURL(objectUrl);
  }
}

export type PlayCoachTurnTtsOptions = {
  signal?: AbortSignal;
  pauseBetweenSpeakersMs?: number;
  onSegmentFocus?: (focusKey: string) => void;
  onSegmentBlur?: () => void;
  onInterSpeakerBridge?: (active: boolean) => void;
  shouldContinue?: () => boolean;
  /** 있으면 채팅 스트림 말풍선 순서와 동일하게 재생 */
  streamSegments?: CoachStreamSegment[] | null;
};

/** 턴을 구간별로 나눠 코치별 Neural 보이스로 순서대로 재생합니다. */
export async function playCoachTurnNeuralTts(
  turn: CoachStrategicTurn,
  primaryCoach: CoachPersonaId,
  options?: PlayCoachTurnTtsOptions
): Promise<void> {
  const segs =
    options?.streamSegments && options.streamSegments.length > 0
      ? coachStreamTtsSegments(options.streamSegments, primaryCoach)
      : coachTurnTtsSegments(turn, primaryCoach);
  const pauseMs = options?.pauseBetweenSpeakersMs ?? 1000;
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
      if (process.env.NODE_ENV === "development" && e instanceof Error) {
        console.warn("[BAPS TTS]", e.message);
      }
      return;
    }
  }
  options?.onSegmentBlur?.();
}
