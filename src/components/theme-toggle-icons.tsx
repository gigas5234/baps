"use client";

import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

/** 햄버거 하단·게스트 헤더용 소형 라이트/다크 토글 */
export function ThemeToggleIcons({ className }: { className?: string }) {
  const { theme, setTheme } = useAppTheme();

  return (
    <div
      className={cn(
        "inline-flex rounded-xl border border-border bg-muted/40 p-0.5 shadow-sm",
        className
      )}
      role="group"
      aria-label="화면 테마"
    >
      <button
        type="button"
        aria-label="라이트 모드"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        className={cn(
          "rounded-lg p-2 transition-colors",
          theme === "light"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sun className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="다크 모드"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        className={cn(
          "rounded-lg p-2 transition-colors",
          theme === "dark"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Moon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
