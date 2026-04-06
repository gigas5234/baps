/**
 * 랜딩 히어로 배경 미디어 — Vercel 등에서 `public/main.mp4`가 배포되지 않을 때
 * NEXT_PUBLIC_LANDING_VIDEO_URL 로 CDN/Blob 절대 URL을 쓰면 됩니다.
 */
function trimUrl(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t && t.length > 0 ? t : undefined;
}

/** 브라우저가 순서대로 시도 (첫 번째 로드 성공 시 그걸 사용) */
export function landingHeroVideoSources(): string[] {
  const fromEnv = trimUrl(process.env.NEXT_PUBLIC_LANDING_VIDEO_URL);
  const local = "/main.mp4";
  const list = fromEnv ? [fromEnv, local] : [local];
  return [...new Set(list)];
}

export function landingHeroPosterUrl(): string | undefined {
  return trimUrl(process.env.NEXT_PUBLIC_LANDING_VIDEO_POSTER_URL);
}

/** 비디오 오류·타임아웃 시 표시 (정지 이미지) */
export function landingHeroFallbackImageUrl(): string | undefined {
  return trimUrl(process.env.NEXT_PUBLIC_LANDING_HERO_FALLBACK_IMG);
}
