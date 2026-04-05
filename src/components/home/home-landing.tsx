"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

type HomeLandingPhase = "loading" | "guest" | "member";

interface HomeLandingProps {
  phase: HomeLandingPhase;
}

/** 히어로 위 얇은 홀로그램 그리드·데이터 포인트·스캔 빔 */
function LandingHeroHud() {
  const gid = useId().replace(/:/g, "");

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-scanner"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient
            id={`hud-stroke-${gid}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="var(--scanner)" stopOpacity="0.55" />
            <stop offset="45%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--scanner)" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* 가이드 라인 (가늘게) */}
        <g
          stroke={`url(#hud-stroke-${gid})`}
          fill="none"
          strokeWidth={0.09}
          vectorEffect="non-scaling-stroke"
          opacity={0.85}
        >
          <path d="M 6 22 L 94 22" />
          <path d="M 6 38 L 78 38" />
          <path d="M 14 54 L 94 54" />
          <path d="M 6 70 L 88 70" />
          <path d="M 6 86 L 72 86" />
          <path d="M 18 8 L 18 94" />
          <path d="M 52 6 L 52 62" />
          <path d="M 84 14 L 84 92" />
        </g>

        {/* 코너 브라켓 */}
        <g
          stroke="var(--scanner)"
          fill="none"
          strokeWidth={0.11}
          vectorEffect="non-scaling-stroke"
          opacity={0.45}
        >
          <path d="M 8 12 L 8 20 L 16 20" />
          <path d="M 92 12 L 92 20 L 84 20" />
          <path d="M 8 88 L 8 80 L 16 80" />
          <path d="M 92 88 L 92 80 L 84 80" />
        </g>

        {/* 라인 끝·교차 마이크로 포인트 + 스캔 픽셀 */}
        {(
          [
            [6, 22],
            [94, 22],
            [78, 38],
            [94, 54],
            [88, 70],
            [18, 8],
            [52, 62],
            [84, 92],
          ] as const
        ).map(([cx, cy], i) => (
          <g key={`${cx}-${cy}-${i}`}>
            <circle
              cx={cx}
              cy={cy}
              r={0.38}
              fill="var(--scanner)"
              className="landing-hud-glint"
              style={{ animationDelay: `${i * 0.25}s` }}
              opacity={0.9}
            />
            <circle
              cx={cx}
              cy={cy}
              r={0.85}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={0.06}
              vectorEffect="non-scaling-stroke"
              opacity={0.35}
            />
          </g>
        ))}
      </svg>

      {/* 수직 스캔 빔 */}
      <div
        className="landing-scan-beam pointer-events-none absolute inset-x-[18%] top-0 h-[14%] opacity-80"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--primary) 55%, transparent) 45%, color-mix(in srgb, var(--scanner) 50%, transparent) 55%, transparent 100%)",
          boxShadow: "0 0 12px color-mix(in srgb, var(--scanner) 40%, transparent)",
        }}
        aria-hidden
      />
    </>
  );
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
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="relative min-h-[64vh] w-full shrink-0 sm:min-h-[70vh]">
        <video
          className="absolute inset-0 h-full w-full object-cover contrast-[1.03] saturate-[1.06] dark:opacity-90"
          autoPlay
          muted
          loop
          playsInline
          aria-label="BAPS 앱 소개 영상"
        >
          <source src="/main.mp4" type="video/mp4" />
        </video>
        {/* 살짝 선명한 제품사진 톤 */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-transparent dark:from-white/[0.04]"
          aria-hidden
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-b",
            "from-background/55 via-background/15 to-background/85",
            "dark:from-background/40 dark:via-black/25 dark:to-background"
          )}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_95%_75%_at_50%_35%,transparent_0%,rgba(0,0,0,0.08)_100%)] dark:bg-[radial-gradient(ellipse_95%_75%_at_50%_35%,transparent_0%,rgba(0,0,0,0.38)_100%)]"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.76] dark:opacity-[0.88]">
          <LandingHeroHud />
        </div>
      </div>

      <div className="relative z-10 -mt-16 flex flex-1 flex-col px-5 pb-36 pt-2 sm:-mt-20 sm:px-8 sm:pb-40">
        <div
          className={cn(
            "mx-auto w-full max-w-lg rounded-2xl border px-5 py-6 shadow-xl",
            "border-white/12 bg-black/60 text-white backdrop-blur-sm",
            "dark:border-white/10 dark:bg-black/65"
          )}
        >
          <p
            className={cn(
              "font-mono text-[11px] font-semibold uppercase tracking-[0.28em]",
              "text-scanner"
            )}
          >
            BAPS
          </p>
          <h1 className="mt-3 font-sans text-[1.55rem] font-bold leading-snug tracking-tight sm:text-[1.75rem] sm:leading-tight">
            사진 한 장으로 완성하는
            <br />
            완벽한 식단 기록
          </h1>
          <p className="mt-3 font-sans text-[0.9375rem] leading-relaxed text-white/85 sm:text-base">
            사진만 찍으면 AI가 칼로리와 탄단지 영양소를 자동으로 분석해
            드립니다. 물 섭취량과 체중 변화까지 한곳에서 관리하며, 복잡한
            입력 없이 간편하게 건강한 습관을 만들어 가세요.
          </p>
        </div>
      </div>

      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-20 border-t border-border",
          "bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
        )}
      >
        <div
          className="mx-auto w-full max-w-lg px-5 py-4 sm:px-8"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {phase === "loading" ? (
            <div className="flex h-14 items-center justify-center gap-2.5 font-sans text-sm text-muted-foreground">
              <Loader2
                className="h-5 w-5 shrink-0 animate-spin text-primary"
                aria-hidden
              />
              <span>로그인 상태 확인 중…</span>
            </div>
          ) : showMemberCta ? (
            <div
              className={cn(
                "landing-cta-gradient-ring rounded-2xl p-px",
                "bg-gradient-to-r from-primary via-scanner to-primary shadow-lg shadow-primary/20"
              )}
            >
              <Link
                href="/"
                className={cn(
                  "flex h-14 w-full items-center justify-center rounded-[0.9375rem] font-sans text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "transition-[filter,transform] hover:brightness-110 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                오늘 식단 기록하기
              </Link>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-2xl p-px",
                "bg-gradient-to-r from-primary/35 via-scanner/40 to-primary/35"
              )}
            >
              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-3 rounded-[0.9375rem] font-sans text-sm font-semibold shadow-md transition-[transform,box-shadow] active:scale-[0.99]",
                  "border border-transparent bg-white text-neutral-900",
                  "hover:bg-white/97 hover:shadow-lg",
                  "disabled:pointer-events-none disabled:opacity-55",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                <GoogleMark className="shrink-0" />
                {busy ? "이동 중…" : "Google로 시작하기"}
              </button>
            </div>
          )}
          {showGoogleCta ? (
            <p className="mt-3 text-center font-sans text-[11px] leading-snug text-muted-foreground">
              로그인하면 기록이 계정에 안전하게 저장돼요.
            </p>
          ) : null}
          {showMemberCta ? (
            <p className="mt-3 text-center font-sans text-[11px] leading-snug text-muted-foreground">
              상단 BAPS 아이콘을 누르면 오늘 식단 홈으로 이동합니다.
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
