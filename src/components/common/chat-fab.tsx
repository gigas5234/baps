// src/components/common/chat-fab.tsx  — v2 Thin Wrapper
// 기존 2,019 LOC → 이 파일 하나로. 실제 렌더는 ChatPanel에 위임.
// FAB 버튼 + Drawer open/close 만 남김.
"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MacroTotals } from "@/lib/meal-macros";
import { ChatPanel } from "@/components/chat/chat-panel";
import { preloadCoachTts } from "@/components/chat/use-coach-tts";

interface ChatFabProps {
  selectedDate: string;
  totalCal: number;
  targetCal: number;
  macros: MacroTotals;
  listenerDisplayName?: string | null;
}

export function ChatFab(props: ChatFabProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  /** FAB hover/포커스 시 TTS 모듈 preload — 실제 대화 진입 지연 줄이기 */
  useEffect(() => { if (open) preloadCoachTts(); }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={preloadCoachTts}
        aria-label="코치 채팅 열기"
        className={cn(
          "fixed bottom-8 right-4 z-40 flex size-14 items-center justify-center rounded-full",
          "bg-foreground text-background shadow-lg",
          "transition-transform hover:scale-105 active:scale-95"
        )}
      >
        <MessageCircle className="size-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={close}
          >
            <motion.section
              key="chat-panel-sheet"
              role="dialog"
              aria-label="코치 룸"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.28 }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute inset-0 overflow-hidden bg-background shadow-2xl"
              )}
            >
              <button
                type="button"
                onClick={close}
                aria-label="닫기"
                className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-card/80 backdrop-blur-sm"
              >
                <X className="size-4 text-muted-foreground" />
              </button>
              <ChatPanel {...props} onClose={close} />
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
