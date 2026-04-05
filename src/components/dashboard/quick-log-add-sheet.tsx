"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Camera, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickLogAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCamera: () => void;
  /** 자주 먹는 메뉴 직접 입력 (폼) */
  onDirectInput: () => void;
}

export function QuickLogAddSheet({
  isOpen,
  onClose,
  onCamera,
  onDirectInput,
}: QuickLogAddSheetProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/45 backdrop-blur-[2px]"
          role="presentation"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            className={cn(
              "w-full max-w-md mx-auto rounded-t-2xl border border-border/80 bg-background px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-xl",
              "dark:border-white/10"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/25" />
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-base font-bold text-foreground">
                퀵 로그에 메뉴 등록
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="pb-3 text-[11px] leading-snug text-muted-foreground">
              자주 먹는 메뉴로 저장해 두면 원탭으로 오늘 식단에 넣을 수 있어요.
            </p>
            <div className="flex flex-col gap-2 pb-6">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCamera();
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-semibold",
                  "bg-primary text-primary-foreground shadow-md shadow-primary/20",
                  "ring-1 ring-primary/20 transition-colors hover:bg-primary/90 active:scale-[0.99]"
                )}
              >
                <Camera className="h-4 w-4" aria-hidden />
                카메라로 등록
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDirectInput();
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-2.5 rounded-xl border border-border py-3.5 text-sm font-medium",
                  "bg-muted/35 text-foreground transition-colors hover:bg-muted/55",
                  "dark:border-white/12 dark:bg-muted/25"
                )}
              >
                <Pencil className="h-4 w-4 text-muted-foreground" aria-hidden />
                직접 입력
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
