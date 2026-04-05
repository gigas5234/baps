import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase-browser";
import type { Meal, WaterLog } from "@/types/database";

function getSupabase() {
  return createClient();
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
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
      return (data as WaterLog) ?? null;
    },
    enabled: !!userId,
  });
}

export function useAddWater(userId: string | undefined, date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (currentCups: number) => {
      if (!userId) throw new Error("Not authenticated");
      const newCups = currentCups + 1;

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
