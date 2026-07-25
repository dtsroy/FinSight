import { QUOTE_API_BASE } from "@/services/quoteService";

/**
 * 个股 code → 名称查询接口。
 *
 * X 光穿透的 Top10 / 重仓预警都只保留股票代码；显示层通过这里按 code 拿名称。
 * 底层调用本地 Python 后端 `GET /get_name_from_code?code=<ticker>`，逐 code 并发请求。
 *
 * - 入参：去重后的 code 数组
 * - 出参：`{ [code]: name }`；查不到 / 请求失败的 code 缺省不返回，
 *   组件用 `map[code] ?? code` 兜底展示 code 本身。
 */
export async function fetchStockNamesByCodes(
  codes: string[],
): Promise<Record<string, string>> {
  if (codes.length === 0) return {};

  const map: Record<string, string> = {};
  await Promise.all(
    codes.map(async (code) => {
      const url = `${QUOTE_API_BASE}/get_name_from_code?code=${encodeURIComponent(code)}`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`[stock-name] ⚠️ 名称查询非 2xx：${res.status} code=${code}`);
          return;
        }
        const json = (await res.json()) as { name?: unknown };
        const name = String(json?.name ?? "").trim();
        if (name) map[code] = name;
      } catch (err) {
        console.warn(`[stock-name] ❌ 名称查询失败（已跳过）：${url}`, err);
      }
    }),
  );
  return map;
}
