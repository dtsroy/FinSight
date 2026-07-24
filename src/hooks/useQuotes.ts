import { useFxRates } from "@/hooks/useFxRates";
import { fetchAssetQuoteChanges, summarizePortfolioChange } from "@/services/quoteService";
import type { Asset } from "@/types/app/asset";
import type { PortfolioQuoteChange, QuoteChangeMap, QuoteChangeRequest } from "@/types/app/quote";
import { isQuotedCategory } from "@/types/app/quote";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/** 从资产列表里挑出「有行情」的条目，拼成查询入参。 */
export function toQuoteRequests(assets: Pick<Asset, "id" | "code" | "category" | "amount" | "currency">[]): QuoteChangeRequest[] {
  return assets
    .filter((asset) => isQuotedCategory(asset.category))
    .map((asset) => ({
      id: asset.id,
      code: asset.code,
      category: asset.category,
      amount: asset.amount,
      currency: asset.currency,
    }));
}

/**
 * 批量读取一批资产的当日涨跌。
 * queryKey 以 (id, code, amount, currency) 为指纹，金额或币种变化会自动重新取数。
 */
export function useAssetQuoteChanges(requests: QuoteChangeRequest[], enabled = true) {
  const fingerprint = useMemo(
    () => requests.map((r) => `${r.id}:${r.code ?? ""}:${r.amount}:${r.currency}`).join("|"),
    [requests],
  );

  return useQuery<QuoteChangeMap>({
    queryKey: ["quote-changes", fingerprint],
    queryFn: () => fetchAssetQuoteChanges(requests),
    enabled: enabled && requests.length > 0,
    staleTime: 1000 * 60 * 5, // 行情 5 分钟内不重复拉取
  });
}

/**
 * 组合级涨跌汇总（CNY）。内部复用 useAssetQuoteChanges + 今日汇率，
 * 未取到行情时返回全零，UI 可直接判断 `covered === 0` 决定是否展示。
 */
export function usePortfolioQuoteChange(requests: QuoteChangeRequest[], enabled = true): {
  data: PortfolioQuoteChange;
  isLoading: boolean;
} {
  const quotes = useAssetQuoteChanges(requests, enabled);
  const fx = useFxRates();

  const data = useMemo(
    () => summarizePortfolioChange(requests, quotes.data ?? {}, fx.data?.rates),
    [requests, quotes.data, fx.data?.rates],
  );

  return { data, isLoading: quotes.isLoading };
}
