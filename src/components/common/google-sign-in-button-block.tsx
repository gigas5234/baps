"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

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

/**
 * 고정 영역 안에 넣는 Google OAuth 버튼 + 안내 문구 (랜딩·게스트 홈 공용)
 */
export function GoogleSignInButtonBlock({
  caption = true,
  className,
}: {
  caption?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    if (busy) return;
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

  return (
    <div className={cn(className)}>
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
      {caption ? (
        <p className="mt-3 text-center font-sans text-[11px] leading-snug text-muted-foreground dark:text-foreground/70">
          로그인하면 기록이 계정에 안전하게 저장돼요.
        </p>
      ) : null}
    </div>
  );
}
