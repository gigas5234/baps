import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import type { FrequentMeal, Meal, Profile, WaterLog } from "@/types/database";

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
      const startOfDay = `${date}T00:00:00`;
      const endOfDay = `${date}T23:59:59`;

      const { data, error } = await getSupabase()
        .from("meals")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
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

// --- Daily calorie total (computed from meals) ---

export function useDailyCalories(meals: Meal[]) {
  return meals.reduce((sum, m) => sum + m.cal, 0);
}
