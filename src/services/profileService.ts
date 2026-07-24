import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/authService";
import type { UserProfile } from "@/types/app/analytics";

export async function getProfile(): Promise<UserProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, monthly_expense, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    user_id: data.user_id,
    monthly_expense: Number(data.monthly_expense),
    updated_at: data.updated_at,
  };
}

export async function upsertMonthlyExpense(monthlyExpense: number): Promise<UserProfile> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("no_user");
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert({ user_id: userId, monthly_expense: monthlyExpense }, { onConflict: "user_id" })
    .select("user_id, monthly_expense, updated_at")
    .single();
  if (error) throw error;
  return {
    user_id: data.user_id,
    monthly_expense: Number(data.monthly_expense),
    updated_at: data.updated_at,
  };
}
