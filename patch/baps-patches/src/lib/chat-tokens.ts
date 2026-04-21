// src/lib/chat-tokens.ts
// Chat v2 — Design tokens (Soft / Ambient)
// chat-fab.tsx 안에 흩어져 있던 Tailwind 클래스 + kakao-coach-bubbles.tsx의 색값을
// 단일 토큰 소스로 뽑아낸다. 코치별 hue 3단 (hue / soft / tint) + 공용 surface/radius/shadow.
//
// 적용 규칙:
//   - `COACH_HUES[personaId]` 만 컴포넌트에서 직접 import.
//   - 개별 hex는 Tailwind arbitrary value(`bg-[${...}]`)로 주입하지 말고, CSS variable
//     `--chat-coach-hue` / `--chat-coach-soft` / `--chat-coach-ink`로 래핑해서 사용.
//     (ChatPanel 루트에서 selected coach에 맞춰 style 주입 → 하위는 var() 참조)
//
// 이유: shadcn 테마 토큰 재사용성 유지 + 런타임 코치 전환을 리렌더 없이 처리 가능.

import type { CoachPersonaId } from "./coach-personas";

export interface CoachHue {
  /** solid · 강조선·링·Send 버튼 */
  hue: string;
  /** 8% tint 배경 — 배지·bubble tint */
  soft: string;
  /** 텍스트(어두운 버전) — tag label */
  ink: string;
  /** 4% alpha · aura / glow */
  tint: string;
  /** mono label — 3글자 내외 */
  label: string;
}

/** 5 코치 hue system. 원본 대비 채도 -15%p 낮춤(면적 확장 시 피로감 감소). */
export const COACH_HUES: Record<CoachPersonaId, CoachHue> = {
  diet:      { hue: "#B4233B", soft: "#FDE8EC", ink: "#86132A", tint: "rgba(180, 35, 59, 0.08)",  label: "감시" },
  nutrition: { hue: "#047857", soft: "#DCF2E8", ink: "#064E3B", tint: "rgba(4, 120, 87, 0.08)",   label: "분석" },
  exercise:  { hue: "#B45309", soft: "#FDECD0", ink: "#78350F", tint: "rgba(180, 83, 9, 0.08)",   label: "환산" },
  mental:    { hue: "#6D28D9", soft: "#EDE5FB", ink: "#4C1D95", tint: "rgba(109, 40, 217, 0.08)", label: "리듬" },
  roi:       { hue: "#1D4ED8", soft: "#DDE8FD", ink: "#1E3A8A", tint: "rgba(29, 78, 216, 0.08)",  label: "회계" },
};

/** ChatPanel 루트에서 호출 — 하위 트리 전역에 코치 hue를 CSS variable로 주입. */
export function coachHueCssVars(personaId: CoachPersonaId): React.CSSProperties {
  const h = COACH_HUES[personaId] ?? COACH_HUES.diet;
  return {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    ["--chat-coach-hue" as string]:  h.hue,
    ["--chat-coach-soft" as string]: h.soft,
    ["--chat-coach-ink" as string]:  h.ink,
    ["--chat-coach-tint" as string]: h.tint,
  };
}

/** 공용 ambient aura — ChatPanel 상·하단에 한 번만 주입. */
export const AMBIENT_AURA_STYLE: React.CSSProperties = {
  backgroundImage: `
    radial-gradient(ellipse 90% 40% at 50% 0%, var(--chat-coach-tint), transparent 60%),
    radial-gradient(ellipse 60% 30% at 20% 100%, var(--chat-coach-tint), transparent 70%)
  `,
  transition: "background-image 400ms ease",
};

/** 버블/turn card halo · streaming 전용 */
export const TTS_HALO_SHADOW =
  "0 0 0 1px color-mix(in srgb, var(--chat-coach-hue) 22%, transparent), " +
  "0 4px 14px -2px color-mix(in srgb, var(--chat-coach-hue) 33%, transparent)";

/** tailwind v4 @theme에도 참조 가능 — globals.css에 동일 값 선언 권장 */
export const CHAT_RADIUS = {
  chip: 999,
  bubble: 16,
  card: 16,
  surface: 20,
} as const;
