"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

type HomeLandingPhase = "loading" | "guest" | "member";

interface HomeLandingProps {
  phase: HomeLandingPhase;
}

export function HomeLanding({ phase }: HomeLandingProps) {
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    if (busy || phase !== "guest") return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const showGoogleCta = phase === "guest";
  const showMemberCta = phase === "member";

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-neutral-950 text-white">
      {/* Hero: video fills most of the viewport */}
      <div className="relative min-h-[64vh] w-full shrink-0 sm:min-h-[70vh]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-label="BAPS 앱 소개 영상"
        >
          <source src="/main.mp4" type="video/mp4" />
        </video>
        {/* Readability: vignette + bottom fade into content */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-black/20 to-black/85"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_30%,transparent_0%,rgba(0,0,0,0.35)_100%)]"
          aria-hidden
        />
      </div>

      {/* Copy: high contrast glass panel */}
      <div className="relative z-10 -mt-16 flex flex-1 flex-col px-5 pb-36 pt-2 sm:-mt-20 sm:px-8 sm:pb-40">
        <div
          className={cn(
            "mx-auto w-full max-w-lg rounded-2xl border border-white/12 px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
            "bg-black/50 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-scanner/95">
            BAPS
          </p>
          <h1 className="mt-2 text-[1.65rem] font-bold leading-snug tracking-tight text-white sm:text-3xl sm:leading-tight [text-shadow:0_2px_20px_rgba(0,0,0,0.35)]">
            사진 한 장으로
            <br />
            오늘 먹은 걸 정리해 드려요
          </h1>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/88 sm:text-base">
            AI가 칼로리·매크로를 추정하고, 물·체중까지 한 화면에서 관리할 수
            있어요. 복잡한 입력 없이 습관만 남깁니다.
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-20 border-t border-white/10",
          "bg-neutral-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-neutral-950/65"
        )}
      >
        <div
          className="mx-auto w-full max-w-lg px-5 py-4 sm:px-8"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {phase === "loading" ? (
            <div className="flex h-14 items-center justify-center gap-2.5 text-sm text-white/75">
              <Loader2
                className="h-5 w-5 shrink-0 animate-spin text-scanner"
                aria-hidden
              />
              <span>로그인 상태 확인 중…</span>
            </div>
          ) : showMemberCta ? (
            <Link
              href="/"
              className={cn(
                "flex h-14 w-full items-center justify-center rounded-2xl text-sm font-semibold shadow-lg transition-[transform,box-shadow] active:scale-[0.99]",
                "border border-scanner/45 bg-scanner/20 text-white shadow-black/40",
                "hover:border-scanner/65 hover:bg-scanner/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scanner focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              )}
            >
              식단 기록으로 돌아가기
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={busy}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-3 rounded-2xl text-sm font-semibold shadow-lg transition-[transform,box-shadow] active:scale-[0.99]",
                "border border-white/15 bg-white text-neutral-900",
                "hover:bg-white/95 hover:shadow-xl",
                "disabled:pointer-events-none disabled:opacity-55",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-scanner focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
              )}
            >
              <GoogleMark className="shrink-0" />
              {busy ? "이동 중…" : "Google로 시작하기"}
            </button>
          )}
          {showGoogleCta ? (
            <p className="mt-3 text-center text-[11px] leading-snug text-white/45">
              로그인하면 기록이 계정에 안전하게 저장돼요.
            </p>
          ) : null}
          {showMemberCta ? (
            <p className="mt-3 text-center text-[11px] leading-snug text-white/45">
              상단 BAPS는 오늘 식단 홈으로 연결돼요.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 18 18"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
