"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const VIDEO_PATH = "/main.mp4";
const SOURCE_SRC = VIDEO_PATH;

interface LandingHeroVideoProps {
  /** 바깥 래퍼(positions, z-index, h/w) */
  className?: string;
  /** video 태그에만 적용(대비·채도 등) */
  videoClassName?: string;
}

function armAutoplayPolicies(el: HTMLVideoElement) {
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute("muted", "");
  el.setAttribute("playsinline", "");
  el.setAttribute("fetchpriority", "high");
  el.playsInline = true;
  const legacy = el as HTMLVideoElement & {
    webkitPlaysinline?: boolean;
  };
  if (legacy.webkitPlaysinline !== undefined) {
    legacy.webkitPlaysinline = true;
  }
}

function tryPlay(el: HTMLVideoElement | null) {
  if (!el) return;
  armAutoplayPolicies(el);
  const run = () => {
    const p = el.play();
    if (p !== undefined) {
      void p.catch(() => {
        requestAnimationFrame(() => {
          void el.play().catch(() => {});
        });
      });
    }
  };
  run();
}

/**
 * 로그인·랜딩 히어로 배경 MP4.
 * - 로딩·디코딩 전에는 플레이스홀더로 ‘로딩 구간’이 보이게 함(게스트 페이지가 바로 그려질 때 빈 느낌 완화)
 * - 재생 정책·네트워크 이슈 대비: canplay, pageshow 등
 */
export function LandingHeroVideo({
  className,
  videoClassName,
}: LandingHeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRetries = useRef(0);
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    armAutoplayPolicies(el);

    const markReady = () => setMediaReady(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay(el);
    };

    const onPageShow = (_e: PageTransitionEvent) => {
      tryPlay(el);
    };

    const onCanPlay = () => {
      markReady();
      tryPlay(el);
    };
    const onLoadedData = () => {
      markReady();
      tryPlay(el);
    };
    const onStalled = () => tryPlay(el);
    const onWaiting = () => tryPlay(el);

    const onError = () => {
      if (errorRetries.current >= 2) return;
      errorRetries.current += 1;
      el.load();
      tryPlay(el);
    };

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("loadeddata", onLoadedData);
    el.addEventListener("stalled", onStalled);
    el.addEventListener("waiting", onWaiting);
    el.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    tryPlay(el);

    return () => {
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* 영상 버퍼·디코딩 전: 로딩 레이어(메인 `/` 게스트는 영상 자체가 없어 여기서 체감 차이가 큼) */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-muted via-muted/90 to-background",
          "transition-opacity duration-500 ease-out",
          mediaReady ? "opacity-0" : "opacity-100"
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-background/25 via-transparent to-transparent",
          !mediaReady && "animate-pulse",
          mediaReady ? "opacity-0" : "opacity-100"
        )}
        style={{ transition: "opacity 0.45s ease-out" }}
        aria-hidden
      />
      <video
        ref={ref}
        className={cn(
          "absolute inset-0 z-[1] h-full w-full object-cover object-center",
          "transition-opacity duration-500 ease-out",
          mediaReady ? "opacity-100" : "opacity-0",
          videoClassName
        )}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disableRemotePlayback
        aria-label="BAPS 앱 소개 영상"
      >
        <source src={SOURCE_SRC} type="video/mp4" />
      </video>
    </div>
  );
}
