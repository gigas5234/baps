import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizedSimilarity } from "@/lib/string-similarity";

export function normalizeNutritionKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export type NutritionCacheRow = {
  food_name_display: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
};

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

const FUZZY_MIN_SIMILARITY = 0.52;
const FUZZY_CANDIDATE_CAP = 45;

export async function lookupNutritionCache(
  supabase: SupabaseClient,
  key: string
): Promise<NutritionCacheRow | null> {
  if (!key) return null;
  const { data, error } = await supabase
    .from("nutrition_dictionary")
    .select("food_name_display, cal, carbs, protein, fat")
    .eq("normalized_key", key)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    food_name_display: String(row.food_name_display ?? ""),
    cal: Math.round(Number(row.cal) || 0),
    carbs: Number(row.carbs) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
  };
}

/** 정확 일치 후, ilike 후보 + 정규화 유사도로 퍼지 매칭 */
export async function lookupNutritionCacheFuzzy(
  supabase: SupabaseClient,
  rawQuery: string
): Promise<NutritionCacheRow | null> {
  const key = normalizeNutritionKey(rawQuery);
  if (!key) return null;

  const exact = await lookupNutritionCache(supabase, key);
  if (exact) return exact;

  const tokens = [...new Set(key.split(" ").filter((t) => t.length >= 2))].slice(
    0,
    4
  );
  if (tokens.length === 0) return null;

  const orFilter = tokens
    .map((t) => `normalized_key.ilike.%${escapeIlike(t)}%`)
    .join(",");

  const { data: rows, error } = await supabase
    .from("nutrition_dictionary")
    .select("normalized_key, food_name_display, cal, carbs, protein, fat")
    .or(orFilter)
    .limit(FUZZY_CANDIDATE_CAP);

  if (error || !rows?.length) return null;

  let best: NutritionCacheRow | null = null;
  let bestSim = 0;

  for (const r of rows as Record<string, unknown>[]) {
    const nk = String(r.normalized_key ?? "");
    const sim = Math.max(
      normalizedSimilarity(key, nk),
      normalizedSimilarity(key, normalizeNutritionKey(nk))
    );
    if (sim > bestSim && sim >= FUZZY_MIN_SIMILARITY) {
      bestSim = sim;
      best = {
        food_name_display: String(r.food_name_display ?? ""),
        cal: Math.round(Number(r.cal) || 0),
        carbs: Number(r.carbs) || 0,
        protein: Number(r.protein) || 0,
        fat: Number(r.fat) || 0,
      };
    }
  }

  return best;
}

export async function upsertNutritionCacheRow(
  supabase: SupabaseClient,
  key: string,
  row: NutritionCacheRow & { source?: string }
): Promise<void> {
  if (!key || !row.food_name_display) return;
  const { error } = await supabase.from("nutrition_dictionary").upsert(
    {
      normalized_key: key,
      food_name_display: row.food_name_display,
      cal: row.cal,
      carbs: row.carbs,
      protein: row.protein,
      fat: row.fat,
      source: row.source ?? "gemini",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "normalized_key" }
  );
  if (error) {
    console.warn("nutrition_dictionary upsert:", error.message);
  }
}
