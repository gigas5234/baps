"use client";

/**
 * TTS 재생 인스턴스 추적 — 메인 번들에서 동기 `stop`만 쓰기 위해 분리.
 * 실제 `play*` 로직은 `coach-tts-client` 동적 청크.
 */

let activeAudio: HTMLAudioElement | null = null;

export function stopCoachNeuralTtsPlayback(): void {
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
