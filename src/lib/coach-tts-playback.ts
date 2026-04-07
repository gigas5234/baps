"use client";

/**
 * TTS 재생 인스턴스 추적 — 메인 번들에서 동기 `stop`만 쓰기 위해 분리.
 * 실제 `play*` 로직은 `coach-tts-client` 동적 청크.
 */

let activeAudio: HTMLAudioElement | null = null;

/** 브라우저 Speech SDK 합성 중단용( synthesizer.close 등 ) */
let activeTtsDispose: (() => void) | null = null;

export function coachTtsRegisterActiveDispose(fn: (() => void) | null): void {
  activeTtsDispose = fn;
}

export function stopCoachNeuralTtsPlayback(): void {
  if (activeTtsDispose) {
    try {
      activeTtsDispose();
    } catch {
      /* synthesizer.close 이중 호출 등 */
    }
    activeTtsDispose = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load();
    activeAudio = null;
  }
}

export function coachTtsSetActiveAudio(audio: HTMLAudioElement | null): void {
  activeAudio = audio;
}

export function coachTtsGetActiveAudio(): HTMLAudioElement | null {
  return activeAudio;
}
