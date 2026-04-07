"use client";

/**
 * [E2E] Autoplay: 느린 네트워크에서도 전송 직후 `unlockCoachTtsAudio()`가 호출됐는지,
 * 첫 TTS 세그먼트가 재생 거절 없이 나오는지 확인.
 *
 * --- 배포 후 수동 체크 (요약) ---
 * - 네트워크 지연·연타 전송 시 이전 TTS가 즉시 끊기는지
 * - 모바일 백그라운드 복귀 시 상태 꼬임
 * - Azure 500 시 텍스트 UI 정상
 * - 코치별 체감 음량 (필요 시 SSML volume 튜닝)
 */

let unlocked = false;

const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function tryWebAudioFallback(): void {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    const buf = ctx.createBuffer(1, 64, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    void ctx.resume().then(() => {
      src.start(0);
      src.stop(ctx.currentTime + 0.03);
      unlocked = true;
      window.setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 120);
    });
  } catch {
    /* 브라우저가 오디오 맥락을 허용하지 않음 — 실제 TTS 시점에 재시도 */
  }
}

/**
 * Autoplay wall 완화: **같은 사용자 제스처에서** `await` 하기 전에 호출.
 * (전송·TTS ON·음성 버튼 탭 등)
 */
export function unlockCoachTtsAudio(): void {
  if (typeof window === "undefined" || unlocked) return;

  try {
    const a = new Audio(SILENT_WAV_DATA_URI);
    a.volume = 0.04;
    void a
      .play()
      .then(() => {
        a.pause();
        a.removeAttribute("src");
        a.load();
        unlocked = true;
      })
      .catch(() => {
        tryWebAudioFallback();
      });
  } catch {
    tryWebAudioFallback();
  }
}
