import { fetchFxRates, type FxRatesSnapshot } from "@/services/fxService";
import { useQuery } from "@tanstack/react-query";

/**
 * 单点读取「今日汇率」— 全站一份共享缓存，Edge Function 又内建 24h 服务端缓存。
 * 未加载完成前上游要么读到 undefined，要么用 CURRENCY_META.baseRate 兜底。
 */
export function useFxRates() {
  return useQuery<FxRatesSnapshot>({
    queryKey: ["fx-rates"],
    queryFn: fetchFxRates,
    staleTime: 1000 * 60 * 60 * 4, // 4 小时之内不再打后端
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
  });
}
