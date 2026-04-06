"use client";

import { cn } from "@/lib/utils";

const baseLead =
  "font-semibold underline decoration-white/25 decoration-1 underline-offset-2";

/**
 * 로그인·랜딩 카드 공통 본문 — 칼로리·매크로·포인트 구문 색·굵기
 */
export function LandingPitchBody({
  className,
}: {
  className?: string;
}) {
  return (
    <p className={className}>
      사진만 찍으면{" "}
      <span className={cn(baseLead, "text-white")}>AI</span>가{" "}
      <span className={cn(baseLead, "text-white")}>칼로리</span>와{" "}
      <span className="font-bold text-white">탄수화물</span>
      <span className="text-white/45">·</span>
      <span className="font-bold text-white">단백질</span>
      <span className="text-white/45">·</span>
      <span className="font-bold text-white">지방</span>
      을 자동으로 분석해 드립니다.{" "}
      <span className="font-semibold text-white">물 섭취량</span>과{" "}
      <span className="font-semibold text-white">체중 변화</span>까지{" "}
      <span className={cn(baseLead, "text-white")}>한곳에서</span>{" "}
      관리하며, 복잡한 입력 없이 간편하게 건강한 습관을 만들어 가세요.
    </p>
  );
}
