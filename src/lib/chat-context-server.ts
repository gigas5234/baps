import type { SupabaseClient } from "@supabase/supabase-js";
import type { CoachApiContext } from "@/lib/chat-coach";
import { sumMealMacros } from "@/lib/meal-macros";
import { normalizeWaterCupMl } from "@/lib/water-cup";
import { getRecommendedWaterMl, getWaterTargetCups } from "@/lib/water-goal";
import { computeEmergencyNutrition } from "@/lib/coach-safety";
import type { Meal, Profile, WaterLog } from "@/types/database";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidApiDate(s: string): boolean {
  if (!YMD_RE.test(s)) return false;
  const t = Date.parse(`${s}T12:00:00`);
  return !Number.isNaN(t);
}

function ymdAddDays(ymd: string, delta: number): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  t.setUTCDate(t.getUTCDate() + delta);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function trimMealLabel(s: string, max = 200): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/** IANA 타임존 기준으로 ISO 시각의 달력 YMD */
function isoToCalendarYmdInTimeZone(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const mo = parts.find((p) => p.type === "month")?.value ?? "";
  const d = parts.find((p) => p.type === "day")?.value ?? "";
  if (!y || !mo || !d) return new Date(iso).toISOString().slice(0, 10);
  return `${y}-${mo}-${d}`;
}

export type MealUtcBounds = {
  range_start: string;
  day_start: string;
  day_end: string;
};

/**
 * 인증된 Supabase 클라이언트로 프로필·해당일 식사·물 기록을 읽어 코치 프롬프트 컨텍스트를 만든다.
 * mealUtcBounds·timeZone 은 클라이언트가 로컬 달력에 맞게 보낸다( naive T00:00 스트링 필터 오류 방지 ).
 */
export async function buildCoachApiContext(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  localHourHint?: number,
  mealUtcBounds?: MealUtcBounds | null,
  timeZone?: string | null
): Promise<CoachApiContext | null> {
  if (!isValidApiDate(date)) return null;

  const dayM1 = ymdAddDays(date, -1);
  const dayM2 = ymdAddDays(date, -2);
  const startOfDay =
    mealUtcBounds?.day_start ?? `${date}T00:00:00`;
  const endOfDay = mealUtcBounds?.day_end ?? `${date}T23:59:59`;
  const rangeStart =
    mealUtcBounds?.range_start ?? `${dayM2}T00:00:00`;

  const tz =
    typeof timeZone === "string" && timeZone.trim() !== ""
      ? timeZone.trim()
      : "UTC";

  const [profileRes, mealsRangeRes, waterRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .gte("eaten_at", rangeStart)
      .lte("eaten_at", endOfDay)
      .order("eaten_at", { ascending: true }),
    supabase
      .from("water_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data) return null;

  const profile = profileRes.data as Profile;
  const mealsRange = (mealsRangeRes.data ?? []) as Meal[];
  const mealClock = (m: Meal) => m.eaten_at ?? m.created_at;
  const meals = mealsRange.filter((m) => {
    const t = new Date(mealClock(m)).getTime();
    return (
      t >= new Date(startOfDay).getTime() &&
      t <= new Date(endOfDay).getTime()
    );
  });

  const sums: Record<string, number> = {
    [date]: 0,
    [dayM1]: 0,
    [dayM2]: 0,
  };
  for (const m of mealsRange) {
    const day = isoToCalendarYmdInTimeZone(mealClock(m), tz);
    if (day in sums) sums[day] += Number(m.cal) || 0;
  }
  const recent_three_day_cal_average =
    (sums[date] + sums[dayM1] + sums[dayM2]) / 3;

  const wl = waterRes.data as WaterLog | null;
  const waterCups =
    wl?.cups != null ? Math.max(0, Math.trunc(Number(wl.cups)) || 0) : 0;

  const cupMl = normalizeWaterCupMl(profile.water_cup_ml);
  const macros = sumMealMacros(meals);
  const currentCal = meals.reduce((s, m) => s + Number(m.cal) || 0, 0);
  const targetCal =
    Number(profile.target_cal) > 0 ? Number(profile.target_cal) : 2000;

  const recommendedMl = getRecommendedWaterMl({
    weightKg: profile.weight,
    gender: profile.gender,
    age: profile.age,
    bmr: Number.isFinite(profile.bmr) ? profile.bmr : null,
    targetCal,
  });
  const waterTargetCups = getWaterTargetCups(recommendedMl, cupMl);
  const waterIntakeMl = waterCups * cupMl;

  const hourRaw =
    localHourHint != null && Number.isFinite(localHourHint)
      ? Math.trunc(localHourHint)
      : NaN;
  const local_hour =
    Number.isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23 ? hourRaw : 12;

  const name = profile.user_name?.trim() || "회원";
  const bmr = Number.isFinite(profile.bmr) ? profile.bmr : null;

  const recent_meals = meals.map((m) => trimMealLabel(m.food_name)).filter(Boolean);
  const meal_lines = meals.map((m) => ({
    food_name: trimMealLabel(m.food_name, 240),
    cal: Number(m.cal) || 0,
    protein_g: Number(m.protein) || 0,
  }));

  const priced_meal_lines = meals
    .filter((m) => m.price_won != null && Number(m.price_won) > 0)
    .map((m) => ({
      food_name: trimMealLabel(m.food_name, 240),
      cal: Number(m.cal) || 0,
      price_won: Math.round(Number(m.price_won) || 0),
    }));

  const meal_spend_won_total =
    priced_meal_lines.length > 0
      ? priced_meal_lines.reduce((s, r) => s + r.price_won, 0)
      : null;

  const user_profile = {
    name,
    target_cal: targetCal,
    current_cal: currentCal,
    bmr,
  };

  const { active: emergency_nutrition_mode, triggers: emergency_triggers } =
    computeEmergencyNutrition({
      bmr,
      target_cal: targetCal,
      current_cal: currentCal,
      recent_three_day_cal_average,
      local_hour,
    });

  return {
    user_profile,
    recent_meals,
    meal_lines,
    macros_g: {
      carbs: macros.carbsG,
      protein: macros.proteinG,
      fat: macros.fatG,
    },
    water_intake_ml: waterIntakeMl,
    water_intake_label: `${waterIntakeMl}ml`,
    water_target_cups: waterTargetCups,
    water_cup_ml: cupMl,
    local_hour,
    emergency_nutrition_mode,
    emergency_triggers,
    recent_three_day_cal_average,
    priced_meal_lines,
    meal_spend_won_total,
  };
}
