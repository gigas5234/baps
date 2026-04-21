"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const DEFAULT_MS = 34;

function graphemeSegments(s: string): string[] {
  try {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const seg = new Intl.Segmenter("ko", { granularity: "grapheme" });
      return [...seg.segment(s)].map((x) => x.segment);
    }
  } catch {
    /* ignore */
  }
  return Array.from(s);
}

export function countCoachGraphemes(s: string): number {
  return graphemeSegments(s).length;
}

type CoachTypewriterProps = {
  text: string;
  /** false 이면 전체 텍스트를 한 번에 표시 (스트리밍 수신 중 등) */
  enabled: boolean;
  startDelayMs?: number;
  msPerGrapheme?: number;
  onComplete?: () => void;
  children: (visible: string) => ReactNode;
};

/**
 * 그래페클 단위 타이핑(읽기 속도보다 조금 빠른 기본 간격).
 */
export function CoachTypewriter({
  text,
  enabled,
  startDelayMs = 0,
  msPerGrapheme = DEFAULT_MS,
  onComplete,
  children,
}: CoachTypewriterProps) {
  const [n, setN] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;
    const g = graphemeSegments(text);
    if (!enabled) {
      setN(g.length);
      return;
    }

    if (g.length === 0) {
      setN(0);
      window.setTimeout(() => onCompleteRef.current?.(), 0);
      return;
    }

    setN(0);
    let cancelled = false;
    let tickId: number | undefined;

    const armComplete = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onCompleteRef.current?.();
    };

    const startTimer = window.setTimeout(() => {
      let i = 0;
      const step = () => {
        if (cancelled) return;
        i += 1;
        const next = Math.min(i, g.length);
        setN(next);
        if (next >= g.length) {
          armComplete();
          return;
        }
        tickId = window.setTimeout(step, msPerGrapheme);
      };
      step();
    }, startDelayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (tickId != null) window.clearTimeout(tickId);
    };
  }, [text, enabled, startDelayMs, msPerGrapheme]);

  const g = graphemeSegments(text);
  const visible = enabled ? g.slice(0, n).join("") : text;
  return <>{children(visible)}</>;
}
