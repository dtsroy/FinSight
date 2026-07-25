import { fetchStockIndustriesByCodes } from "@/services/stockIndustryService";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

/**
 * 按股票代码批量拿行业名。传入的 codes 内部会去重并排序，
 * 使得 query key 在 codes 集合相同时命中缓存，不会因入参顺序变化重复请求。
 *
 * 查不到行业的 code 不会出现在返回 map 中；调用方应把它们归入「未识别行业」。
 */
export function useStockIndustries(codes: string[]) {
  const uniqueCodes = useMemo(() => {
    const s = new Set(codes.filter((c) => !!c && !c.startsWith("__nocode_")));
    return Array.from(s).sort();
  }, [codes]);

  return useQuery({
    queryKey: ["stock_industries", uniqueCodes],
    queryFn: () => fetchStockIndustriesByCodes(uniqueCodes),
    enabled: uniqueCodes.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
