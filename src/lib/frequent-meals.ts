import type { SupabaseClient } from "@supabase/supabase-js";

export type FrequentMealUpsertInput = {
  food_name: string;
  cal: number;
  carbs: number;
  protein: number;
  fat: number;
  image_url: string | null;
};

/**
 * 동일 user_id + food_name(트림)이 있으면 count+1·영양·이미지·last 갱신,
 * 없으면 삽입.
 */
export async function upsertFrequentMealRow(
  supabase: SupabaseClient,
  userId: string,
  input: FrequentMealUpsertInput
): Promise<void> {
  const name = input.food_name.trim();
  if (!name) return;

  const { data: existing, error: selErr } = await supabase
    .from("frequent_meals")
    .select("id, count")
    .eq("user_id", userId)
    .eq("food_name", name)
    .maybeSingle();

  if (selErr) throw selErr;

  const nowIso = new Date().toISOString();

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from("frequent_meals")
      .update({
        cal: input.cal,
        carbs: input.carbs,
        protein: input.protein,
        fat: input.fat,
        image_url: input.image_url,
        count: Number(existing.count ?? 0) + 1,
        last_eaten_at: nowIso,
      })
      .eq("id", existing.id);

    if (upErr) throw upErr;
    return;
  }

  const { error: insErr } = await supabase.from("frequent_meals").insert({
    user_id: userId,
    food_name: name,
    cal: input.cal,
    carbs: input.carbs,
    protein: input.protein,
    fat: input.fat,
    image_url: input.image_url,
    count: 1,
    last_eaten_at: nowIso,
  });

  if (insErr) throw insErr;
}

/** Quick Log 후 같은 행 빈도만 갱신 */
export async function bumpFrequentMealLog(
  supabase: SupabaseClient,
  frequentId: string
): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from("frequent_meals")
    .select("count")
    .eq("id", frequentId)
    .single();

  if (selErr) throw selErr;

  const { error: upErr } = await supabase
    .from("frequent_meals")
    .update({
      count: Number(row?.count ?? 0) + 1,
      last_eaten_at: new Date().toISOString(),
    })
    .eq("id", frequentId);

  if (upErr) throw upErr;
}
