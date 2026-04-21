// src/components/chat/use-coach-tts.ts
// Chat v2 — TTS 스트리밍 훅
// chat-fab.tsx 안에 coachTtsModPromise 모듈 캐시 + CoachStreamTtsSentencePipeline +
// unlock/stop refs 7개(coachTtsAudioUnlockRef · audioCtxRef · coachTtsPipelineRef ...)
// 가 흩어져 있던 것을 훅 1개로 흡수.
//
// 책임:
//   - 오디오 언락 (사용자 첫 터치 이후)
//   - 스트리밍 청크를 pipeline에 feed
//   - stop / mute 제공
//   - speaking 상태 (halo/EQ용) 노출

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CoachStreamTtsSentencePipeline,
  type StreamTtsChunk,
} from "@/lib/coach-stream-tts-pipeline";
import { unlockCoachTtsAudio } from "@/lib/chat-audio-unlock";
import { stopCoachNeuralTtsPlayback } from "@/lib/coach-tts-playback";
import type { CoachPersonaId } from "@/lib/coach-personas";

type CoachTtsModule = typeof import("@/lib/coach-tts-client");
let modCache: Promise<CoachTtsModule> | null = null;

/** 초기 번들 경량화: LCP 이후 preload. */
export function preloadCoachTts(): void {
  modCache ??= import("@/lib/coach-tts-client");
}

function loadMod(): Promise<CoachTtsModule> {
  preloadCoachTts();
  return modCache!;
}

export interface UseCoachTtsOptions {
  /** 사용자가 끈 상태는 localStorage 에서 읽어 초기값으로 전달 */
  enabledInitial?: boolean;
  persona: CoachPersonaId;
}

/**
 * useCoachTts — streaming 문장 → Azure Neural TTS 재생.
 *
 * @example
 * const tts = useCoachTts({ persona, enabledInitial: !muted });
 * useEffect(() => { tts.unlock(); }, []);           // 사용자 터치 후
 * for await (const chunk of stream) tts.push(chunk);
 * tts.finalize();                                   // 턴 끝
 */
export function useCoachTts({ persona, enabledInitial = true }: UseCoachTtsOptions) {
  const [enabled, setEnabled] = useState(enabledInitial);
  const [speaking, setSpeaking] = useState(false);

  const pipelineRef = useRef<CoachStreamTtsSentencePipeline | null>(null);
  const unlockedRef = useRef(false);

  /** 파이프라인 lazy 생성. persona 변경 시 교체. */
  useEffect(() => {
    const p = new CoachStreamTtsSentencePipeline({
      persona,
      loadModule: loadMod,
      onSpeakingChange: setSpeaking,
    });
    pipelineRef.current = p;
    return () => {
      p.dispose();
      pipelineRef.current = null;
    };
  }, [persona]);

  const unlock = useCallback(async () => {
    if (unlockedRef.current) return;
    await unlockCoachTtsAudio();
    unlockedRef.current = true;
  }, []);

  const push = useCallback(
    (chunk: StreamTtsChunk) => {
      if (!enabled) return;
      pipelineRef.current?.feed(chunk);
    },
    [enabled]
  );

  const finalize = useCallback(() => {
    pipelineRef.current?.finalize();
  }, []);

  const stop = useCallback(() => {
    stopCoachNeuralTtsPlayback();
    pipelineRef.current?.reset();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((v) => {
      if (v) stop(); // 끄면 즉시 현재 재생 중단
      return !v;
    });
  }, [stop]);

  return {
    enabled,
    speaking,
    unlock,
    push,
    finalize,
    stop,
    toggle,
  };
}
