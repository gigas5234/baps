"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const VIDEO_PATH = "/main.mp4";
/** `#t=` 는 일부 모바일/프록시에서 Range 요청을 깨뜨릴 수 있어 생 URL만 사용 */
const SOURCE_SRC = VIDEO_PATH;

interface LandingHeroVideoProps {
  className?: string;
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
 * 로그인·랜딩 히어로 배경용 MP4.
 * - muted + playsInline + JS에서 muted 재확인(브라우저 자동재생 정책)
 * - canplay / loadeddata / stalled / 탭 복귀 / bfcache 복원 시 play() 재시도
 */
export function LandingHeroVideo({ className }: LandingHeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRetries = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    armAutoplayPolicies(el);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay(el);
    };

    const onPageShow = (_e: PageTransitionEvent) => {
      /** bfcache 복원뿐 아니라 iOS 등에서 앞으로/뒤로 이동 후에도 재생 재시도 */
      tryPlay(el);
    };

    const onCanPlay = () => tryPlay(el);
    const onLoadedData = () => tryPlay(el);
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
    <video
      ref={ref}
      className={cn(className)}
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
  );
}
