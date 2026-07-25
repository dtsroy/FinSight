import { QUOTE_API_BASE } from "@/services/quoteService";

/**
 * 个股 code → 行业（板块）查询接口。
 *
 * X 光穿透的 Top5 行业统计只依赖股票代码；显示层通过这里按 code 拿行业名。
 * 底层调用本地 Python 后端 `GET /get_industry_from_code?code=<ticker>`，逐 code 并发请求。
 *
 * - 入参：去重后的 code 数组
 * - 出参：`{ [code]: industry }`；查不到 / 请求失败的 code 缺省不返回，
 *   调用方应把这些股票归入「未识别行业」而不是让整个统计失败。
 */
export async function fetchStockIndustriesByCodes(
  codes: string[],
): Promise<Record<string, string>> {
  if (codes.length === 0) return {};

  const map: Record<string, string> = {};
  await Promise.all(
    codes.map(async (code) => {
      const url = `${QUOTE_API_BASE}/get_industry_from_code?code=${encodeURIComponent(code)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[stock-industry] ⚠️ 行业查询非 2xx：${res.status} code=${code}`);
          return;
        }
        const json = (await res.json()) as { industry?: unknown };
        const industry = String(json?.industry ?? "").trim();
        if (industry) map[code] = industry;
      } catch (err) {
        console.warn(`[stock-industry] ❌ 行业查询失败（已跳过）：${url}`, err);
      }
    }),
  );
  return map;
}
