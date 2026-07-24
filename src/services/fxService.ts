import { supabase } from "@/integrations/supabase/client";
import { CURRENCY_META, type FxRateMap } from "@/lib/currency";

export interface FxRatesSnapshot {
  base: string;
  rates: FxRateMap;
  updatedAt: string;
  source: string;
  stale: boolean;
}

const FALLBACK_RATES: FxRateMap = Object.fromEntries(
  Object.entries(CURRENCY_META).map(([code, meta]) => [code, meta.baseRate]),
);

const FALLBACK: FxRatesSnapshot = {
  base: "CNY",
  rates: FALLBACK_RATES,
  updatedAt: new Date(0).toISOString(),
  source: "fallback",
  stale: true,
};

/**
 * 拿今日汇率快照。get-fx-rates 内部已做 24 小时缓存 + 外部拉取失败回落，
 * 前端再叠一层 React Query 4h staleTime 就足够避免刷屏时的重复请求。
 */
export async function fetchFxRates(): Promise<FxRatesSnapshot> {
  const { data, error } = await supabase.functions.invoke("get-fx-rates", { body: {} });
  if (error) {
    console.warn("get-fx-rates_invoke_failed", error);
    return FALLBACK;
  }
  const payload = data as {
    base?: string;
    rates?: Record<string, unknown>;
    updated_at?: string;
    source?: string;
    stale?: boolean;
  } | null;
  if (!payload || !payload.rates) return FALLBACK;
  const cleanedRates: FxRateMap = { ...FALLBACK_RATES };
  for (const [code, value] of Object.entries(payload.rates)) {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) cleanedRates[code] = num;
  }
  return {
    base: payload.base ?? "CNY",
    rates: cleanedRates,
    updatedAt: payload.updated_at ?? new Date().toISOString(),
    source: payload.source ?? "unknown",
    stale: Boolean(payload.stale),
  };
}
