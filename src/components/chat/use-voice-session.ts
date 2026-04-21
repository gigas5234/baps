// src/components/chat/use-voice-session.ts
// Chat v2 — STT 음성 세션 훅
// chat-fab.tsx 안의 startAzureChatStt 호출부 + VAD 타이머 + interimText state 4개 묶음을
// 훅 1개로 수렴. HUD(VoiceSessionHudFrame) 표시 여부는 호출자가 결정.
//
// 책임:
//   - Azure STT 세션 start/stop
//   - interim / final transcript
//   - VAD idle timeout → 자동 종료
//   - 마이크 권한 에러 수면

import { useCallback, useEffect, useRef, useState } from "react";
import {
  startAzureChatStt,
  type AzureSttSession,
} from "@/lib/chat-azure-stt";

export interface UseVoiceSessionOptions {
  onFinal: (text: string) => void;
  idleTimeoutMs?: number;
}

export function useVoiceSession({ onFinal, idleTimeoutMs = 4000 }: UseVoiceSessionOptions) {
  const [active, setActive] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<AzureSttSession | null>(null);
  const idleRef = useRef<number | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);

  const clearIdle = useCallback(() => {
    if (idleRef.current != null) {
      window.clearTimeout(idleRef.current);
      idleRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setActive(false);
    setInterim("");
    clearIdle();
  }, [clearIdle]);

  const start = useCallback(async () => {
    if (sessionRef.current) return;
    setError(null);
    try {
      let latest = "";
      const session = await startAzureChatStt({
        onInterim: (t: string) => {
          latest = t;
          setInterim(t);
          clearIdle();
          idleRef.current = window.setTimeout(() => {
            const finalText = (session?.getLatestText?.() ?? latest).trim();
            if (finalText) onFinalRef.current(finalText);
            stop();
          }, idleTimeoutMs);
        },
        onError: (msg: string) => {
          setError(msg);
          stop();
        },
      });
      sessionRef.current = session;
      setActive(true);
      idleRef.current = window.setTimeout(() => {
        const finalText = (session?.getLatestText?.() ?? latest).trim();
        if (finalText) onFinalRef.current(finalText);
        stop();
      }, idleTimeoutMs);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [clearIdle, idleTimeoutMs, stop]);

  useEffect(() => () => stop(), [stop]);

  return { active, interim, error, start, stop };
}
