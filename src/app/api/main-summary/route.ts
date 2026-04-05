import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/api-auth";
import {
  buildCoachApiContext,
  isValidApiDate,
  type MealUtcBounds,
} from "@/lib/chat-context-server";
import { buildMainDashboardInsightPrompt } from "@/lib/main-summary-prompt";
import {
  coachGoogleProviderOptions,
  coachLanguageModel,
} from "@/lib/coach-google-ai";
import { getCalorieZone } from "@/lib/calorie-zone";

export const maxDuration = 30;

function parseMealUtcBounds(
  body: Record<string, unknown>
): MealUtcBounds | null {
  const b = body.meal_utc_bounds;
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  const range_start =
    typeof o.range_start === "string" ? o.range_start.trim() : "";
  const day_start =
    typeof o.day_start === "string" ? o.day_start.trim() : "";
  const day_end = typeof o.day_end === "string" ? o.day_end.trim() : "";
  if (!range_start || !day_start || !day_end) return null;
  return { range_start, day_start, day_end };
}

function parseTimeZone(body: Record<string, unknown>): string | null {
  const t =
    typeof body.time_zone === "string"
      ? body.time_zone.trim()
      : typeof (body as { timeZone?: unknown }).timeZone === "string"
        ? String((body as { timeZone: string }).timeZone).trim()
        : "";
  return t || null;
}

function parseLocalHour(body: Record<string, unknown>): number | undefined {
  const lh = body.local_hour;
  if (typeof lh === "number" && Number.isFinite(lh)) return lh;
  if (typeof lh === "string" && lh.trim() !== "") {
    const n = Number(lh);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

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
