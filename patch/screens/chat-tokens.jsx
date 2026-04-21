// BAPS Chat Redesign — Design tokens
// Soft/Ambient — 카톡 잔재 제거, 무드 있는 프리미엄, 기존 토큰(primary/muted-foreground/border) 수용
// Light 기반 (baps design system과 동일) + 코치별 hue 은은하게

window.ChatTokens = {
  // Surface
  appBg: '#f5f3ee',              // warm paper
  surface: '#ffffff',
  surfaceMuted: 'rgba(15, 23, 42, 0.03)',
  surfaceRaised: '#ffffff',
  ink: '#0f172a',
  inkMuted: 'rgba(15, 23, 42, 0.6)',
  inkFaint: 'rgba(15, 23, 42, 0.42)',
  border: 'rgba(15, 23, 42, 0.08)',
  borderStrong: 'rgba(15, 23, 42, 0.14)',
  primary: '#c96442',            // baps primary (terracotta)
  primarySoft: 'rgba(201, 100, 66, 0.1)',

  // Coach hues (subtler than original — 12~18% sat)
  coaches: {
    diet:      { hue: '#b4233b', soft: '#fde8ec', tint: 'rgba(180,35,59,0.08)',  ink: '#86132a', label: '감시' },
    nutrition: { hue: '#047857', soft: '#dcf2e8', tint: 'rgba(4,120,87,0.08)',   ink: '#064e3b', label: '분석' },
    exercise:  { hue: '#b45309', soft: '#fdecd0', tint: 'rgba(180,83,9,0.08)',   ink: '#78350f', label: '환산' },
    mental:    { hue: '#6d28d9', soft: '#ede5fb', tint: 'rgba(109,40,217,0.08)', ink: '#4c1d95', label: '리듬' },
    roi:       { hue: '#1d4ed8', soft: '#dde8fd', tint: 'rgba(29,78,216,0.08)',  ink: '#1e3a8a', label: '회계' },
  },

  // Radii
  r: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },

  // Shadows
  shadowSoft: '0 1px 2px rgba(15,23,42,0.03), 0 2px 8px rgba(15,23,42,0.04)',
  shadowRaised: '0 2px 4px rgba(15,23,42,0.04), 0 10px 24px -6px rgba(15,23,42,0.08)',
  shadowGlow: (hex) => `0 0 0 1px ${hex}22, 0 4px 14px -2px ${hex}33`,

  // Font
  font: '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", ui-monospace, monospace',
};

window.CoachData = [
  { id: 'diet',      emoji: '🚨', name: '다이어트',  role: '실시간 칼로리 감시',      voice: '[검거] 의지력 0%',   tagline: '숟가락 속도까지 본다' },
  { id: 'nutrition', emoji: '🥗', name: '영양',       role: '탄단지 밸런스 정밀 분석', voice: '[보고] 단백질 -22%', tagline: '몸은 정직한 실험실' },
  { id: 'exercise',  emoji: '🏃', name: '운동',       role: '활동량 압박 & 환산',      voice: '[환산] 버피 40회',   tagline: '땀을 칼로리로 환산' },
  { id: 'mental',    emoji: '🧠', name: '멘탈',       role: '가짜 허기 & 생체 리듬',   voice: '[진단] 수면 부채',   tagline: '뇌의 도파민 오류' },
  { id: 'roi',       emoji: '📊', name: '가성비',     role: '칼로리 회계 · 예산 집행', voice: '[결산] 수익률 -18%', tagline: '자산 대비 저효율' },
];
