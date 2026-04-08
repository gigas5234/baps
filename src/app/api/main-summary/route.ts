import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import { buildCoachApiContext, isValidApiDate } from "@/lib/chat-context-server";
import { buildMainDashboardInsightPrompt } from "@/lib/main-summary-prompt";
import {
  coachGoogleProviderOptions,
  coachLanguageModel,
} from "@/lib/coach-google-ai";
import { getCalorieZone } from "@/lib/calorie-zone";
import {
  parseLocalHour,
  parseMealUtcBounds,
  parseTimeZone,
} from "@/utils/time-parser";

export const maxDuration = 30;

function sanitizeLine(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ");
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("“") && s.endsWith("”"))
  ) {
    s = s.slice(1, -1).trim().replace(/\s+/g, " ");
  }
  if (s.length > 160) {
    s = `${s.slice(0, 157)}…`;
  }
  return s;
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedSupabaseUser();
    if (!user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const rawDate = typeof body.date === "string" ? body.date.trim() : "";
    const date = isValidApiDate(rawDate) ? rawDate : "";
    if (!date) {
      return NextResponse.json(
        { error: "날짜(date)가 필요합니다.", code: "BAD_DATE" },
        { status: 400 }
      );
    }

    const local_time_label =
      typeof body.local_time_label === "string" &&
      body.local_time_label.trim() !== ""
        ? body.local_time_label.trim().slice(0, 40)
        : "";

    const ctx = await buildCoachApiContext(
      supabase,
      user.id,
      date,
      parseLocalHour(body),
      parseMealUtcBounds(body),
      parseTimeZone(body)
    );

    if (!ctx) {
      return NextResponse.json(
        {
          error: "프로필을 불러오지 못했습니다.",
          code: "PROFILE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const model = coachLanguageModel();
    if (!model) {
      return NextResponse.json(
        {
          error: "AI API 키가 설정되지 않았습니다.",
          code: "MISSING_GEMINI_KEY",
        },
        { status: 503 }
      );
    }

    const zone = getCalorieZone(
      ctx.user_profile.current_cal,
      ctx.user_profile.target_cal
    );

    const prompt = buildMainDashboardInsightPrompt(ctx, {
      dateYmd: date,
      localTimeLabel: local_time_label || `약 ${ctx.local_hour}시`,
      zone,
    });

    const { text } = await generateText({
      model,
      prompt,
      temperature: 0.55,
      maxOutputTokens: 200,
      providerOptions: coachGoogleProviderOptions,
    });

    const line = sanitizeLine(text ?? "");
    if (!line) {
      return NextResponse.json(
        { error: "응답이 비었습니다.", code: "EMPTY_LINE" },
        { status: 502 }
      );
    }

    return NextResponse.json({ line, source: "gemini" });
  } catch (e) {
    console.error("main-summary error:", e);
    return NextResponse.json(
      { error: "인사이트 생성에 실패했습니다.", code: "GENERATION_FAILED" },
      { status: 502 }
    );
  }
}
