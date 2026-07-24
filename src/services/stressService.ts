import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/authService";
import type { StressTestRun } from "@/types/app/analytics";

function toRun(row: Record<string, unknown>): StressTestRun {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    scenario: String(row.scenario),
    scenario_label: String(row.scenario_label),
    estimated_loss: Number(row.estimated_loss),
    loss_pct: Number(row.loss_pct),
    recovery_days: row.recovery_days == null ? null : Number(row.recovery_days),
    emergency_months: row.emergency_months == null ? null : Number(row.emergency_months),
    detail: (row.detail ?? {}) as StressTestRun["detail"],
    created_at: String(row.created_at),
  };
}

export async function getLatestStressRuns(): Promise<StressTestRun[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  // 取最新一轮 run_id，再以此为键拉同一轮的全部情景，避免并发跑时混入不同轮次。
  const latestRun = await supabase
    .from("stress_test_runs")
    .select("run_id, created_at")
    .eq("user_id", userId)
    .not("run_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestRun.error) throw latestRun.error;
  if (!latestRun.data?.run_id) return [];
  const { data, error } = await supabase
    .from("stress_test_runs")
    .select("*")
    .eq("user_id", userId)
    .eq("run_id", latestRun.data.run_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(toRun);
}

export async function runStressTest(scenarios?: string[]): Promise<StressTestRun[]> {
  const { data, error } = await supabase.functions.invoke<{ runs: Record<string, unknown>[] }>(
    "run-stress-test",
    { body: { scenarios } },
  );
  if (error) throw error;
  return (data?.runs ?? []).map(toRun);
}
