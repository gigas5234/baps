"use client";

import { useEffect, useRef } from "react";

type VoiceSessionHudFrameProps = {
  /** 누르고 있는 동안(음성 입력 중)만 표시 */
  active: boolean;
  /** 마이크 레벨 분석용 — 없으면 기본 펄스만 */
  mediaStream: MediaStream | null;
};

/**
 * 콕핏 HUD: 패널 전체 inset 네온 민트 테두리 + 호흡 펄스.
 * mediaStream이 있으면 주파수 데시벨에 따라 glow 강도 보강.
 */
export function VoiceSessionHudFrame({
  active,
  mediaStream,
}: VoiceSessionHudFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!active || !mediaStream || !el) return;

    let ctx: AudioContext | null = null;
    let raf = 0;
    let running = true;
    const smooth = { v: 0.12 };

    void (async () => {
      try {
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        src.connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!running) return;
          analyser.getByteFrequencyData(buf);
          let s = 0;
          for (let i = 0; i < buf.length; i++) s += buf[i];
          const raw = Math.min(1, (s / buf.length / 255) * 1.85);
          smooth.v = smooth.v * 0.72 + raw * 0.28;
          el.style.setProperty("--baps-voice-hud-level", smooth.v.toFixed(3));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        el.style.setProperty("--baps-voice-hud-level", "0.18");
      }
    })();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [active, mediaStream]);

  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="baps-voice-hud-frame pointer-events-none absolute inset-0 z-[17]"
      style={{ ["--baps-voice-hud-level" as string]: "0.14" }}
      aria-hidden
    />
  );
}
