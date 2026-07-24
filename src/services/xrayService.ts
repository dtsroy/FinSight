import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/authService";
import type { XRayReport } from "@/types/app/analytics";

function toReport(row: Record<string, unknown>): XRayReport {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    total_amount: Number(row.total_amount),
    fund_amount: Number(row.fund_amount),
    stock_amount: Number(row.stock_amount),
    cash_amount: Number(row.cash_amount),
    concentration_score: Number(row.concentration_score),
    top_industry: (row.top_industry ?? null) as string | null,
    top_industry_pct: row.top_industry_pct == null ? null : Number(row.top_industry_pct),
    industry_exposure: (row.industry_exposure ?? []) as XRayReport["industry_exposure"],
    top_stocks: (row.top_stocks ?? []) as XRayReport["top_stocks"],
    duplicate_holdings: (row.duplicate_holdings ?? []) as XRayReport["duplicate_holdings"],
    alerts: (row.alerts ?? []) as XRayReport["alerts"],
    unmatched_funds: (row.unmatched_funds ?? []) as XRayReport["unmatched_funds"],
    created_at: String(row.created_at),
  };
}

export async function getLatestXRay(): Promise<XRayReport | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("xray_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toReport(data as Record<string, unknown>) : null;
}

export async function runXRayScan(): Promise<XRayReport> {
  const { data, error } = await supabase.functions.invoke<{ report: Record<string, unknown> }>(
    "compute-xray-report",
    { body: {} },
  );
  if (error) throw error;
  if (!data?.report) throw new Error("empty_report");
  return toReport(data.report);
}
