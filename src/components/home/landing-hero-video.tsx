"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  landingHeroFallbackImageUrl,
  landingHeroPosterUrl,
  landingHeroVideoSources,
} from "@/lib/landing-hero-media";

const LOAD_TIMEOUT_MS = 12_000;

interface LandingHeroVideoProps {
  className?: string;
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
  const p = el.play();
  if (p !== undefined) {
    void p.catch(() => {
      requestAnimationFrame(() => {
        void el.play().catch(() => {});
      });
    });
  }
}

function isRemoteUrl(u: string) {
  return u.startsWith("http://") || u.startsWith("https://");
}

/**
 * 로그인·랜딩 히어로 배경 MP4.
 * - 소스: NEXT_PUBLIC_LANDING_VIDEO_URL(우선) + /main.mp4
 * - Vercel에 mp4 미포함 시: 외부 MP4 URL 또는 포스터/폴백 이미지 env
 */
export function LandingHeroVideo({
  className,
  videoClassName,
}: LandingHeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRetries = useRef(0);
  const mediaReadyRef = useRef(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);

  const sources = useMemo(() => landingHeroVideoSources(), []);
  const posterUrl = useMemo(() => landingHeroPosterUrl(), []);
  const fallbackImg = useMemo(() => landingHeroFallbackImageUrl(), []);

  const stillSrcWhenBroken =
    videoBroken && (fallbackImg || posterUrl)
      ? (fallbackImg ?? posterUrl)!
      : null;

  useEffect(() => {
    if (videoBroken) return;
    const el = ref.current;
    if (!el) return;

    armAutoplayPolicies(el);

    const markReady = () => {
      mediaReadyRef.current = true;
      setMediaReady(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") tryPlay(el);
    };

    const onPageShow = () => tryPlay(el);

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
      if (errorRetries.current >= 2) {
        setVideoBroken(true);
        return;
      }
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

    const timeoutId = window.setTimeout(() => {
      if (!mediaReadyRef.current) {
        setVideoBroken(true);
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("loadeddata", onLoadedData);
      el.removeEventListener("stalled", onStalled);
      el.removeEventListener("waiting", onWaiting);
      el.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [videoBroken]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {stillSrcWhenBroken ? (
        isRemoteUrl(stillSrcWhenBroken) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stillSrcWhenBroken}
            alt=""
            className={cn(
              "absolute inset-0 z-[2] h-full w-full object-cover object-center",
              videoClassName
            )}
            aria-hidden
          />
        ) : (
          <Image
            src={stillSrcWhenBroken}
            alt=""
            fill
            className={cn("object-cover object-center", videoClassName)}
            sizes="100vw"
            priority
            aria-hidden
          />
        )
      ) : null}

      {videoBroken && !stillSrcWhenBroken ? (
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-br from-muted via-muted/80 to-background"
          aria-hidden
        />
      ) : null}

      {!videoBroken ? (
        <>
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt=""
              className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
              aria-hidden
            />
          ) : null}

          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-muted via-muted/90 to-background",
              posterUrl ? "opacity-50" : "opacity-100",
              "transition-opacity duration-500 ease-out",
              mediaReady ? "opacity-0" : undefined
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
            poster={posterUrl || undefined}
            aria-label="BAPS 앱 소개 영상"
          >
            {sources.map((src) => (
              <source key={src} src={src} type="video/mp4" />
            ))}
          </video>
        </>
      ) : null}
    </div>
  );
}
