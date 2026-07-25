import { fetchStockNamesByCodes } from "@/services/stockNameService";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * 按股票代码批量拿名称。传入的 codes 内部会去重并排序，
 * 使得 query key 在 codes 集合相同时命中缓存，不会因入参顺序变化重复请求。
 *
 * 目前底层实现（stockNameService）尚未接入外部 API，返回值为空对象；
 * 组件应把 `map[code] ?? code` 当作展示名，未匹配到就用 code 兜底。
 */
export function useStockNames(codes: string[]) {
  const uniqueCodes = useMemo(() => {
    const s = new Set(codes.filter((c) => !!c && !c.startsWith("__nocode_")));
    return Array.from(s).sort();
  }, [codes]);

  return useQuery({
    queryKey: ["stock_names", uniqueCodes],
    queryFn: () => fetchStockNamesByCodes(uniqueCodes),
    enabled: uniqueCodes.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
