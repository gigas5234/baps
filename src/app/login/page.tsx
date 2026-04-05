"use client";

import { createClient } from "@/lib/supabase-browser";
import { GoogleSignInButtonBlock } from "@/components/common/google-sign-in-button-block";
import { LandingHeroHud } from "@/components/home/home-landing";
import { cn } from "@/lib/utils";

/** Supabase에 Kakao OAuth 연동 후 `true`로 전환 */
const ENABLE_KAKAO_LOGIN = false;

export default function LoginPage() {
  const handleKakao = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div className="relative min-h-[64vh] w-full shrink-0 sm:min-h-[70vh]">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex flex-col items-center px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-center sm:px-8">
          <h1
            className={cn(
              "font-mono text-[2.85rem] font-bold leading-none tracking-tight sm:text-6xl",
              "text-black dark:text-white",
              "drop-shadow-[0_1px_10px_rgba(255,255,255,0.55)] dark:drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]"
            )}
          >
            BAPS
          </h1>
          <p
            className={cn(
              "mt-2 max-w-sm font-sans text-sm leading-snug sm:text-base",
              "text-black/80 dark:text-white/85"
            )}
          >
            AI가 관리하는 나의 식단
          </p>
        </div>

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
          <h2 className="mt-3 font-sans text-[1.55rem] font-bold leading-snug tracking-tight sm:text-[1.75rem] sm:leading-tight">
            사진 한 장으로 완성하는
            <br />
            완벽한 식단 기록
          </h2>
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
          className="mx-auto w-full max-w-lg space-y-3 px-5 py-4 sm:px-8"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          {ENABLE_KAKAO_LOGIN ? (
            <button
              type="button"
              onClick={() => void handleKakao()}
              className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 px-4 text-sm font-medium transition-colors"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                <path
                  fill="#191919"
                  d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.57-.58 2.07-.66 2.4-.11.4.14.39.3.29.12-.08 1.95-1.32 2.74-1.86.63.09 1.28.14 1.98.14 4.42 0 8-2.79 8-6.21S13.42 1 9 1z"
                />
              </svg>
              카카오로 시작하기
            </button>
          ) : null}
          <GoogleSignInButtonBlock />
        </div>
      </div>
    </div>
  );
}
