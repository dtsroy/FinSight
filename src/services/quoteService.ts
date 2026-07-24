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
 * 用 https 地址，避免 HTTPS 页面调用 http 接口时被浏览器 Mixed Content 静默拦截。
 */
const QUOTE_API_BASE =
  (import.meta.env.VITE_QUOTE_API_URL as string | undefined) ??
  "https://47.116.77.105";

/**
 * 调试开关：分类算法决定去请求涨跌时，在控制台打印每条资产的判定结果与目标接口。
 * 调试完成后把它改成 false 即可关闭日志（不再有任何弹窗）。
 */
const DEBUG_QUOTE_LOG = true;

/**
 * Call the local Python backend for a single asset's day-change %.
 * Returns null when the backend is unreachable or returns an error.
 */
async function fetchChangePct(
  category: "stock" | "fund",
  code: string,
): Promise<number | null> {
  const endpoint = category === "stock" ? "get_stock_diff" : "get_fund_diff";
  const url = `${QUOTE_API_BASE}/${endpoint}?code=${encodeURIComponent(code)}`;

  // 混合内容自检：页面是 HTTPS 但接口是 HTTP 时，浏览器会在请求发出前就静默拦截，
  // 后端因此收不到任何请求。这里显式报出来，避免再被 catch 吞掉。
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.startsWith("http://")
  ) {
    console.error(
      `[quote] ❌ Mixed Content 拦截：页面是 HTTPS，但行情接口是 HTTP，浏览器已在发送前拦截。\n` +
        `  URL = ${url}\n` +
        `  解决：把 QUOTE_API_BASE 换成 https 的 cpolar 地址，或用 http 打开前端。`,
    );
    return null;
  }

  try {
    console.debug(`[quote] → GET ${url}`);
    const res = await fetch(url);
    console.debug(`[quote] ← ${res.status} ${res.statusText}  (${url})`);
    if (!res.ok) {
      const body = await res.text().catch(() => "<无法读取响应体>");
      console.warn(`[quote] ⚠️ 非 2xx 响应：${res.status}，body=`, body);
      return null;
    }
    const json = (await res.json()) as { change_pct: number };
    return json.change_pct;
  } catch (err) {
    console.error(
      `[quote] ❌ 请求失败（常见原因：Mixed Content / CORS / cpolar 拦截页 / 网络）：${url}`,
      err,
    );
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

  // 先跑一遍分类算法，得到每条资产「走哪个接口 / 是否跳过」的判定。
  const decisions = requests.map((req) => ({
    req,
    instrument: classifyQuoteInstrument(req.code, req.category),
  }));

  // 调试用：算法决定请求涨跌的这一刻，把判定明细打到控制台。
  if (DEBUG_QUOTE_LOG) logQuoteDecisions(decisions);

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

/** 每条资产判定：instrument 为 null 表示算法认为它没有行情。 */
type QuoteDecision = {
  req: QuoteChangeRequest;
  instrument: ReturnType<typeof classifyQuoteInstrument>;
};

/**
 * 调试日志：把「分类算法的判定 + 目标接口」打印到控制台，方便核对每条资产
 * 被判成股票还是基金、命中哪个后端接口、以及哪些被跳过。（不再使用 alert 弹窗）
 */
function logQuoteDecisions(decisions: QuoteDecision[]): void {
  if (decisions.length === 0) {
    console.debug("[quote] 本次没有可请求行情的资产（requests 为空）");
    return;
  }
  const willFetch = decisions.filter((d) => d.instrument !== null);
  console.group(
    `[quote] 即将请求涨跌 ${willFetch.length}/${decisions.length} 条 · base=${QUOTE_API_BASE}`,
  );
  for (const { req, instrument } of decisions) {
    const code = req.code ?? req.id;
    if (!instrument) {
      console.debug(`⏭️ ${code}（类别 ${req.category}）→ 跳过（判为无行情）`);
    } else {
      const endpoint = instrument === "stock" ? "get_stock_diff" : "get_fund_diff";
      console.debug(`📈 ${code}（类别 ${req.category}）→ ${instrument} · /${endpoint}`);
    }
  }
  console.groupEnd();
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
