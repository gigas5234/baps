import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import type {
  FrequentMeal,
  Meal,
  Profile,
  WaterLog,
} from "@/types/database";
import type { WeightEntry } from "@/lib/weight-local-storage";
import { localYmdToUtcRangeIso } from "@/lib/local-date";
import { fetchMainDashboardInsight } from "@/lib/main-summary-client";

function getSupabase() {
  return createClient();
}

// --- Profile ---

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await getSupabase()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

// --- Meals ---

export function useMeals(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["meals", userId, date],
    queryFn: async () => {
      if (!userId) return [];
      const { start, end } = localYmdToUtcRangeIso(date);

      const { data, error } = await getSupabase()
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []) as Meal[];
    },
    enabled: !!userId,
  });
}

// --- Frequent meals (Quick Log) ---

export function useFrequentMeals(userId: string | undefined) {
  return useQuery({
    queryKey: ["frequentMeals", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await getSupabase()
        .from("frequent_meals")
        .select("*")
        .eq("user_id", userId)
        .order("count", { ascending: false })
        .limit(40);

      if (error) throw error;
      return (data ?? []) as FrequentMeal[];
    },
    enabled: !!userId,
  });
}

// --- Water Logs ---

export function useWaterLog(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["water", userId, date],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await getSupabase()
        .from("water_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .maybeSingle();

      if (error) throw error;
      return (data as WaterLog) ?? null;
    },
    enabled: !!userId,
  });
}

// --- Weight logs (체중 추이 동기화) ---

export function useWeightLogs(userId: string | undefined, oldestDate: string) {
  return useQuery({
    queryKey: ["weightLogs", userId, oldestDate],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await getSupabase()
        .from("weight_logs")
        .select("date, kg")
        .eq("user_id", userId)
        .gte("date", oldestDate)
        .order("date", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(
        (r) =>
          ({
            date: r.date,
            kg: typeof r.kg === "string" ? Number.parseFloat(r.kg) : Number(r.kg),
          }) satisfies WeightEntry
      );
    },
    enabled: !!userId && !!oldestDate,
  });
}

export function useUpsertWeightLog(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, kg }: { date: string; kg: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await getSupabase().rpc(
        "upsert_weight_log_and_profile",
        { p_date: date, p_kg: kg }
      );
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weightLogs", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useAdjustWater(userId: string | undefined, date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      currentCups,
      delta,
    }: {
      currentCups: number;
      delta: number;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const newCups = Math.max(0, currentCups + delta);

      const { error } = await getSupabase().from("water_logs").upsert(
        { user_id: userId, date, cups: newCups },
        { onConflict: "user_id,date" }
      );

      if (error) throw error;
      return newCups;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["water", userId, date] });
    },
  });
}

export function useDeleteMeal(userId: string | undefined, date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mealId: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await getSupabase()
        .from("meals")
        .delete()
        .eq("id", mealId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals", userId, date] });
    },
  });
}

// --- Daily calorie total (computed from meals) ---

export function useDailyCalories(meals: Meal[]) {
  return meals.reduce((sum, m) => sum + m.cal, 0);
}

/** 데이터가 바뀌면 같은 날짜라도 AI 인사이트를 다시 요청 */
export function useMainDashboardInsight(
  userId: string | undefined,
  selectedDate: string,
  dataFingerprint: string
) {
  return useQuery({
    queryKey: ["mainInsight", userId, selectedDate, dataFingerprint],
    queryFn: async () => {
      const r = await fetchMainDashboardInsight({ date: selectedDate });
      if (r.line == null) return null;
      return r.line;
    },
    enabled: Boolean(userId && selectedDate),
    staleTime: 60_000,
  });
}
