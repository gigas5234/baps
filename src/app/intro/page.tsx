"use client";

import { HomeLanding } from "@/components/home/home-landing";
import { useAuth } from "@/lib/use-auth";

/** 소개 영상·랜딩 (로그인 여부에 따라 CTA만 다름) */
export default function IntroPage() {
  const { userId, loading } = useAuth();

  if (loading) {
    return <HomeLanding phase="loading" />;
  }

  if (!userId) {
    return <HomeLanding phase="guest" />;
  }

  return <HomeLanding phase="member" />;
}
