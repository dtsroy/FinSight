import { convertAmount, type FxRateMap } from "@/lib/currency";
import type {
  AssetQuoteChange,
  PortfolioQuoteChange,
  QuoteChangeMap,
  QuoteChangeRequest,
} from "@/types/app/quote";
import { classifyQuoteInstrument } from "@/types/app/quote";

/**
 * Quote backend base URL — cpolar intranet tunnel.
 * Override via VITE_QUOTE_API_URL in .env.local when testing locally without the tunnel.
 */
const QUOTE_API_BASE =
  (import.meta.env.VITE_QUOTE_API_URL as string | undefined) ??
  "http://55b599cd.r7.cpolar.top";

/**
 * Call the local Python backend for a single asset's day-change %.
 * Returns null when the backend is unreachable or returns an error.
 */
async function fetchChangePct(
  category: "stock" | "fund",
  code: string,
): Promise<number | null> {
  const endpoint = category === "stock" ? "get_stock_diff" : "get_fund_diff";
  try {
    const res = await fetch(
      `${QUOTE_API_BASE}/${endpoint}?code=${encodeURIComponent(code)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { change_pct: number };
    return json.change_pct;
  } catch {
    return null;
  }
}

/**
 * ⭐️ 唯一需要接真实行情 API 的接缝 ⭐️
 *
 * 传入一批「有行情」的资产（基金/股票等），返回以资产 id 为键的当日涨跌。
 * 现在调用本地 Python 后端（backend/main.py）。
 *
 * 若后端不可达，该资产不放进 map（UI 会跳过，与脚手架行为一致）。
 */
export async function fetchAssetQuoteChanges(
  requests: QuoteChangeRequest[],
): Promise<QuoteChangeMap> {
  const map: QuoteChangeMap = {};
  const nowIso = new Date().toISOString();

  await Promise.all(
    requests.map(async (req) => {
      // 用代码 + 类别的综合算法判断走股票还是基金行情接口；判不出来则跳过。
      const instrument = classifyQuoteInstrument(req.code, req.category);
      if (!instrument) return;

      const code = req.code ?? req.id;
      const changePct = await fetchChangePct(instrument, code);

      if (changePct === null) return; // backend unreachable — skip silently

      map[req.id] = {
        code,
        changePct,
        changeAmount: req.amount * (changePct / 100),
        currency: req.currency,
        asOf: nowIso,
      };
    }),
  );

  return map;
}

/**
 * 把各资产的涨跌额折算成人民币后汇总成组合级涨跌。
 * - `changeAmount`：各资产涨跌额 → CNY 相加；
 * - `changePct`：汇总涨跌额 ÷ 参与资产的「昨收市值」（现值 - 涨跌额），得到组合整体涨跌幅。
 *
 * 传入 `rates` 时按今日汇率折算，否则回落到 currency.ts 内置参考汇率——
 * 与总资产聚合口径保持一致。
 */
export function summarizePortfolioChange(
  requests: QuoteChangeRequest[],
  changes: QuoteChangeMap,
  rates?: FxRateMap | null,
): PortfolioQuoteChange {
  let changeCny = 0;
  let prevCloseCny = 0;
  let covered = 0;

  for (const req of requests) {
    const change = changes[req.id];
    if (!change) continue;
    covered += 1;
    const changeInCny = convertAmount(change.changeAmount, change.currency, "CNY", rates);
    const currentInCny = convertAmount(req.amount, req.currency, "CNY", rates);
    changeCny += changeInCny;
    // 昨收市值 = 当前市值 - 当日涨跌额，作为百分比分母。
    prevCloseCny += currentInCny - changeInCny;
  }

  const changePct = prevCloseCny > 0 ? (changeCny / prevCloseCny) * 100 : 0;
  return { changeAmount: changeCny, changePct, covered };
}

export type { AssetQuoteChange };
