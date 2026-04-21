// src/components/chat/use-atrium-bootstrap.ts
// Chat v2 — Atrium (첫 진입) 부트스트랩 훅
// chat-fab.tsx 안에 openingCoachSynced / quickChipsBootstrapKeyRef 등 동기화 플래그로
// 흩어진 로직을 정리. 코치별 opening + quick chips를 서버에서 한 번만 받아온다.

import { useCallback, useEffect, useRef, useState } from "react";
import { postCoachChat } from "@/lib/coach-chat-client";
import type { QuickChip } from "@/lib/chat-coach";
import {
  buildChatAtriumWelcome,
  type CoachPersonaId,
} from "@/lib/coach-personas";

const FALLBACK_CHIPS: QuickChip[] = [
  { label: "오늘 식단 평가", prompt: "오늘 식단을 팩트로 짧게 평가해줘." },
  { label: "남은 칼로리",   prompt: "남은 칼로리를 숫자로 말해줘." },
  { label: "저녁 추천",     prompt: "저녁에 뭐 먹으면 좋을지 추천해줘." },
];

export interface UseAtriumBootstrapOptions {
  persona: CoachPersonaId;
  selectedDate: string;
  userDisplayName?: string | null;
}

export function useAtriumBootstrap({
  persona,
  selectedDate,
  userDisplayName,
}: UseAtriumBootstrapOptions) {
  const [opening, setOpening] = useState<string>(() =>
    buildChatAtriumWelcome(userDisplayName ?? "")
  );
  const [quickChips, setQuickChips] = useState<QuickChip[]>(FALLBACK_CHIPS);
  const [loading, setLoading] = useState(false);

  /** 같은 (persona+date) 조합으로는 1회만 요청 */
  const keyRef = useRef<string>("");

  const bootstrap = useCallback(async () => {
    const key = `${persona}::${selectedDate}`;
    if (keyRef.current === key) return;
    keyRef.current = key;
    setLoading(true);
    try {
      const outcome = await postCoachChat({
        coach_id: persona,
        date: selectedDate,
        bootstrap: true,
      });
      const d = (outcome.data ?? {}) as Record<string, unknown>;
      if (outcome.ok) {
        if (typeof d.opening === "string") setOpening(d.opening);
        if (Array.isArray(d.quick_chips)) {
          setQuickChips((d.quick_chips as QuickChip[]).slice(0, 3));
        }
      }
    } catch {
      /* fallback chips stay */
    } finally {
      setLoading(false);
    }
  }, [persona, selectedDate]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return { opening, quickChips, loading, refresh: bootstrap };
}
