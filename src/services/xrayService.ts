import { supabase } from "@/integrations/supabase/client";
import { listQuotableAssets } from "@/services/assetService";
import { getCurrentUserId } from "@/services/authService";
import { fetchFundTopHoldings } from "@/services/quoteService";
import type { XRayReport } from "@/types/app/analytics";
import type { FundTopHolding } from "@/types/app/quote";

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

/**
 * 扫描前的实时重仓预拉取（best-effort）：
 * 逐只有代码的基金调用行情后端 /get_fund_zc；拉不到的基金（上游报错、
 * 无股票披露、后端不可用）直接被舍弃、不进返回表 —— edge function 会对
 * 这些基金回退到静态底稿，底稿也没收录的按「未穿透」列入 unmatched_funds，
 * 金额计入"未知底层"，不会静默丢失。
 * 预拉取本身的任何异常（未登录、资产查询失败等）也不阻断扫描：退化为纯静态底稿穿透。
 */
async function fetchLiveFundHoldings(): Promise<Record<string, FundTopHolding[]>> {
  try {
    const assets = await listQuotableAssets();
    const codes = Array.from(
      new Set(
        assets
          .filter((a) => a.category === "fund" && a.code != null)
          .map((a) => (a.code as string).trim())
          .filter(Boolean),
      ),
    );
    if (codes.length === 0) return {};

    console.debug(`[xray-debug] fetchLiveFundHoldings 待拉取基金代码 (${codes.length}):`, codes);

    const live: Record<string, FundTopHolding[]> = {};
    await Promise.all(
      codes.map(async (code) => {
        const holdings = await fetchFundTopHoldings(code);
        // null = 拉取失败或空仓披露，直接舍弃该基金（失败原因已在 quoteService 打日志）。
        if (!holdings) {
          console.debug(`[xray-debug] fetchLiveFundHoldings 基金 ${code} → 无实时重仓（舍弃，将回退静态底稿）`);
          return;
        }
        console.debug(`[xray-debug] fetchLiveFundHoldings 基金 ${code} → 保留 ${holdings.length} 条实时重仓`);
        live[code] = holdings;
      }),
    );
    console.debug(
      `[xray-debug] fetchLiveFundHoldings 最终 live_holdings 命中基金数=${Object.keys(live).length}:`,
      live,
    );
    return live;
  } catch (err) {
    console.warn("[xray] 实时重仓预拉取失败，本次扫描将只使用静态底稿", err);
    return {};
  }
}

export async function runXRayScan(): Promise<XRayReport> {
  // 先尽力拉取每只基金的实时重仓；拿不到的由后端回退静态底稿或标记未穿透。
  const liveHoldings = await fetchLiveFundHoldings();
  console.debug("[xray-debug] runXRayScan 即将发送给 compute-xray-report 的 live_holdings:", liveHoldings);
  const { data, error } = await supabase.functions.invoke<{ report: Record<string, unknown> }>(
    "compute-xray-report",
    { body: { live_holdings: liveHoldings } },
  );
  if (error) throw error;
  if (!data?.report) throw new Error("empty_report");
  console.debug("[xray-debug] runXRayScan 收到 report 原始数据:", data.report);
  console.debug("[xray-debug] runXRayScan report.unmatched_funds（未穿透基金）:", data.report.unmatched_funds);
  console.debug("[xray-debug] runXRayScan report.top_stocks:", data.report.top_stocks);
  console.debug("[xray-debug] runXRayScan report.industry_exposure:", data.report.industry_exposure);
  return toReport(data.report);
}
