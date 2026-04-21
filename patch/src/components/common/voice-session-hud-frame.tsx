"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** 말이 끝난 뒤 이 시간(ms) 무음이면 자동 종료 */
const DEFAULT_SILENCE_MS = 2000;
const RMS_SPEECH_THRESHOLD = 0.028;
const MAX_WAIT_NO_SPEECH_MS = 15000;
/** 조용할 때 잔물결(최소 글로우 레벨) */
const IDLE_RIPPLE_MIN = 0.072;
const IDLE_RIPPLE_AMP = 0.018;

export type VoiceHudMode = "hidden" | "listening" | "analyzing";

type VoiceSessionHudFrameProps = {
  mode: VoiceHudMode;
  /** listening일 때만 필요 — 레벨·VAD 분석 */
  mediaStream: MediaStream | null;
  /** 무음 자동 종료 (한 번만 호출) */
  onSilenceAutoEnd?: () => void;
  silenceMs?: number;
};

/**
 * 콕핏 HUD: 민트 테두리.
 * - listening: 데시벨 반응 + 무음 VAD
 * - analyzing: 가장자리가 슥 수축·페이드 (자동 종료 직후)
 */
export function VoiceSessionHudFrame({
  mode,
  mediaStream,
  onSilenceAutoEnd,
  silenceMs = DEFAULT_SILENCE_MS,
}: VoiceSessionHudFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onEndRef = useRef(onSilenceAutoEnd);
  const reduceMotion = useReducedMotion();
  onEndRef.current = onSilenceAutoEnd;

  useEffect(() => {
    const el = rootRef.current;
    if (mode !== "listening" || !mediaStream || !el) return;

    let ctx: AudioContext | null = null;
    let raf = 0;
    let running = true;
    const smooth = { v: IDLE_RIPPLE_MIN };
    let lastLoudAt = performance.now();
    let sessionStart = performance.now();
    let hadSpeech = false;
    let vadFired = false;

    const fireEnd = () => {
      if (vadFired) return;
      vadFired = true;
      running = false;
      cancelAnimationFrame(raf);
      queueMicrotask(() => onEndRef.current?.());
    };

    void (async () => {
      try {
        ctx = new AudioContext();
        if (ctx.state === "suspended") await ctx.resume();
        const src = ctx.createMediaStreamSource(mediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.45;
        src.connect(analyser);
        const timeBuf = new Uint8Array(analyser.fftSize);

        const tick = (ts: number) => {
          if (!running) return;

          analyser.getByteTimeDomainData(timeBuf);
          let sum = 0;
          for (let i = 0; i < timeBuf.length; i++) {
            const v = (timeBuf[i]! - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / timeBuf.length);
          const now = performance.now();

          if (rms >= RMS_SPEECH_THRESHOLD) {
            hadSpeech = true;
            lastLoudAt = now;
          }

          const isSpeechy = rms >= RMS_SPEECH_THRESHOLD * 0.85;
          const tSec = ts / 1000;
          const ripple =
            IDLE_RIPPLE_MIN +
            Math.sin(tSec * 2.1) * IDLE_RIPPLE_AMP * (isSpeechy ? 0.35 : 1);

          const targetLevel = isSpeechy
            ? Math.min(1, 0.18 + rms * 4.2)
            : ripple;

          smooth.v = smooth.v * (isSpeechy ? 0.42 : 0.88) + targetLevel * (isSpeechy ? 0.58 : 0.12);
          el.style.setProperty("--baps-voice-hud-level", smooth.v.toFixed(3));

          if (hadSpeech && now - lastLoudAt >= silenceMs) {
            fireEnd();
            return;
          }
          if (!hadSpeech && now - sessionStart >= MAX_WAIT_NO_SPEECH_MS) {
            fireEnd();
            return;
          }

          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        el.style.setProperty("--baps-voice-hud-level", "0.14");
      }
    })();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      void ctx?.close();
    };
  }, [mode, mediaStream, silenceMs]);

  if (mode === "hidden") return null;

  return (
    <motion.div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-40",
        mode === "listening" && "baps-voice-hud-frame",
        mode === "analyzing" && "baps-voice-hud-frame baps-voice-hud-frame--analyze-out"
      )}
      style={{ ["--baps-voice-hud-level" as string]: "0.14" }}
      initial={false}
      animate={
        reduceMotion || mode === "listening"
          ? { opacity: 1, scale: 1 }
          : mode === "analyzing"
            ? { opacity: 0, scale: 0.96 }
            : { opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
      aria-hidden
    />
  );
}
