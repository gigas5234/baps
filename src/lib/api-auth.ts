import { createClient } from "@/lib/supabase-server";

/** Route Handler에서 Supabase 세션(쿠키) 기반 유저 확인 */
export async function getAuthenticatedSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null };
  }
  return { supabase, user };
}
