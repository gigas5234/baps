"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface CameraCaptureModalProps {
  isOpen: boolean;
  /** 부모가 사용자 탭 직후에 획득한 스트림(iOS 제스처 요구 충족) */
  stream: MediaStream | null;
  onClose: () => void;
  onCapture: (file: File) => void;
  onUseNativeCamera: () => void;
}

export function CameraCaptureModal({
  isOpen,
  stream,
  onClose,
  onCapture,
  onUseNativeCamera,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen || !stream) {
      setReady(false);
      setCapturing(false);
      return;
    }
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => {});
  }, [isOpen, stream]);

  const handleShutter = () => {
    const v = videoRef.current;
    if (!v || v.videoWidth < 2 || v.videoHeight < 2 || capturing) return;
    setCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setCapturing(false);
        return;
      }
      ctx.drawImage(v, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setCapturing(false);
            return;
          }
          const file = new File([blob], `baps-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onCapture(file);
          onClose();
          setCapturing(false);
        },
        "image/jpeg",
        0.92
      );
    } catch {
      setCapturing(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleNativeFallback = () => {
    onUseNativeCamera();
  };

  const showVideo = Boolean(stream);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[55] flex flex-col bg-black"
        >
          <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-white">
            <p className="text-sm font-semibold">사진 찍기</p>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-2 hover:bg-white/10"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 bg-black">
            {showVideo ? (
              <video
                ref={videoRef}
                className={cn(
                  "h-full w-full object-cover",
                  !ready && "opacity-0"
                )}
                playsInline
                muted
                autoPlay
                onLoadedData={() => setReady(true)}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <p className="text-sm text-white/90">
                  카메라를 불러오지 못했어요.
                </p>
                <button
                  type="button"
                  onClick={handleNativeFallback}
                  className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <Smartphone className="h-4 w-4" aria-hidden />
                  기기 카메라로 열기
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-white/60 underline"
                >
                  취소
                </button>
              </div>
            )}
            {showVideo && !ready ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/70">
                카메라 준비 중…
              </div>
            ) : null}
          </div>

          {showVideo ? (
            <div
              className="flex items-center justify-between border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
              style={{ background: "rgba(0,0,0,0.85)" }}
            >
              <button
                type="button"
                onClick={handleNativeFallback}
                className="max-w-[38%] text-left text-[11px] leading-snug text-white/75 underline-offset-2 hover:text-white hover:underline"
              >
                기기 카메라로 대신
              </button>
              <button
                type="button"
                disabled={!ready || capturing}
                onClick={handleShutter}
                className={cn(
                  "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/20 shadow-lg transition-transform",
                  "disabled:opacity-40 active:scale-95"
                )}
                aria-label="촬영"
              >
                <Camera className="h-7 w-7 text-white" />
              </button>
              <div className="max-w-[38%]" aria-hidden />
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
