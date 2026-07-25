import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";
import { toBaseAmount } from "../_shared/currency.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

interface AssetRow {
  id: string;
  name: string;
  category: string;
  platform: string | null;
  amount: number;
  currency: string | null;
  code: string | null;
}
interface FundHolding {
  fund_code: string;
  stock_code: string;
  weight: number;
}
/** 前端预拉取的实时重仓条目（来自行情后端 /get_fund_zc，只有代码 + 权重）。 */
interface LiveHoldingItem {
  stock_code: string;
  weight: number;
}
interface StockExposure {
  stock_code: string;
  amount: number;
  pct: number;
  sources: { fund_code?: string; fund_name?: string; amount: number; direct?: boolean }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, jwt } = auth;

  // 前端在调用前会向行情后端逐基金预拉取实时重仓，通过 body.live_holdings 传入；
  // 拉不到（报错/无披露）的基金不会出现在里面。这里只做防御性校验：
  // 形状不对、权重非正数的条目一律丢弃，不让脏数据污染穿透结果。
  const liveHoldingsMap = new Map<string, LiveHoldingItem[]>();
  try {
    const body = await req.json();
    const raw = (body as Record<string, unknown> | null)?.live_holdings;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [fundCode, items] of Object.entries(raw as Record<string, unknown>)) {
        if (!Array.isArray(items)) continue;
        const valid: LiveHoldingItem[] = [];
        for (const it of items) {
          const rec = it as Record<string, unknown> | null;
          const stockCode = String(rec?.stock_code ?? "").trim();
          const weight = Number(rec?.weight);
          if (!stockCode || !Number.isFinite(weight) || weight <= 0) continue;
          valid.push({ stock_code: stockCode, weight });
        }
        if (valid.length > 0) liveHoldingsMap.set(String(fundCode), valid);
      }
    }
  } catch {
    // 无 body 或 JSON 解析失败：当作没有实时数据，继续走静态底稿。
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const assetsRes = await supabase
    .from("assets")
    .select("id, name, category, platform, amount, currency, code")
    .eq("user_id", userId);
  if (assetsRes.error) {
    console.error("xray_assets_load_failed", assetsRes.error);
    return jsonResponse({ error: "load_failed" }, 500);
  }
  const assets = (assetsRes.data ?? []) as AssetRow[];
  if (assets.length === 0) {
    return jsonResponse({ error: "no_assets", message: "尚未导入任何资产，无法生成 X 光" }, 400);
  }

  // 所有金额先按参考汇率折算为人民币等值，避免跨币种直接相加得到错误集中度。
  const totalAmount = assets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
  const cashAmount = assets
    .filter((a) => a.category === "bank_deposit" || a.category === "cash_management")
    .reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
  const fundAssets = assets.filter((a) => a.category === "fund");
  const stockAssets = assets.filter((a) => a.category === "stock");
  const fundAmount = fundAssets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
  const stockAmount = stockAssets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);

  const fundCodes = Array.from(new Set(fundAssets.map((a) => a.code).filter(Boolean).map(String)));
  // 已有实时重仓的基金不再查静态底稿，底稿只作为未命中基金的回退。
  const fallbackFundCodes = fundCodes.filter((c) => !liveHoldingsMap.has(c));

  // 只查基金名称（用于展示"这只股票来自哪只基金"）和静态底稿；
  // 个股名称不再由后端解析——前端会用 stock_code 走外部接口异步补齐。
  const [mastersRes, holdingsRes] = await Promise.all([
    supabase.from("fund_master").select("fund_code, fund_name")
      .in("fund_code", fundCodes.length ? fundCodes : ["__none__"]),
    supabase.from("fund_holdings").select("fund_code, stock_code, weight")
      .in("fund_code", fallbackFundCodes.length ? fallbackFundCodes : ["__none__"]),
  ]);
  if (mastersRes.error || holdingsRes.error) {
    console.error("xray_reference_load_failed", mastersRes.error, holdingsRes.error);
    return jsonResponse({ error: "reference_load_failed" }, 500);
  }

  const masterMap = new Map<string, string>((mastersRes.data ?? [])
    .map((m: { fund_code: string; fund_name: string }) => [m.fund_code, m.fund_name]));
  const holdingsMap = new Map<string, FundHolding[]>();
  for (const h of (holdingsRes.data ?? []) as FundHolding[]) {
    if (!holdingsMap.has(h.fund_code)) holdingsMap.set(h.fund_code, []);
    holdingsMap.get(h.fund_code)!.push(h);
  }

  const stockExposureMap = new Map<string, StockExposure>();
  const unmatched: { code: string | null; name: string; amount: number; reason: string }[] = [];

  const addStock = (
    code: string,
    amount: number,
    source: StockExposure["sources"][number],
  ) => {
    let entry = stockExposureMap.get(code);
    if (!entry) {
      entry = { stock_code: code, amount: 0, pct: 0, sources: [] };
      stockExposureMap.set(code, entry);
    }
    entry.amount += amount;
    entry.sources.push(source);
  };

  // 基金穿透优先级：实时重仓（前端预拉取）> 静态底稿 fund_holdings > 未收录。
  // 披露的权重摊到底层个股；未披露残值 + 无代码/未收录基金 → 未穿透。
  for (const fa of fundAssets) {
    const amount = toBaseAmount(fa.amount, fa.currency);
    if (!fa.code) {
      unmatched.push({ code: null, name: fa.name, amount, reason: "无基金代码" });
      continue;
    }
    const code = String(fa.code);
    const fundName = masterMap.get(code) ?? fa.name;

    const liveItems = liveHoldingsMap.get(code);
    let items: FundHolding[];
    if (liveItems) {
      // 实时重仓只有代码 + 权重；名称/行业不再本地解析，全部交给前端。
      items = liveItems.map((h) => ({
        fund_code: code,
        stock_code: h.stock_code,
        weight: h.weight,
      }));
    } else {
      items = holdingsMap.get(code) ?? [];
    }

    if (items.length === 0) {
      unmatched.push({ code, name: fundName, amount, reason: "实时重仓不可用且底稿未收录" });
      continue;
    }
    let disclosedWeight = 0;
    for (const h of items) disclosedWeight += Number(h.weight);
    disclosedWeight = Math.min(100, disclosedWeight);
    for (const h of items) {
      const stockAmount = amount * (Number(h.weight) / 100);
      addStock(h.stock_code, stockAmount, {
        fund_code: code,
        fund_name: fundName,
        amount: stockAmount,
      });
    }
    // 未披露残值：依旧记入 unmatched_funds，但标为“披露不足”，
    // 前端可据此向用户提示“Top10 占比只代表已披露部分”，避免“假分散”错觉。
    const residualPct = Math.max(0, 100 - disclosedWeight);
    if (residualPct > 0.5) {
      const residualAmount = amount * (residualPct / 100);
      unmatched.push({
        code,
        name: fundName,
        amount: residualAmount,
        reason: `披露不足（仅披露 ${disclosedWeight.toFixed(1)}%）`,
      });
    }
  }

  // 股票：优先按代码合并到穿透后个股。无代码个股用稳定占位 code 避免与他人合并。
  for (const sa of stockAssets) {
    const amount = toBaseAmount(sa.amount, sa.currency);
    if (!sa.code) {
      const placeholder = `__nocode_${sa.id}`;
      addStock(placeholder, amount, { direct: true, amount });
      continue;
    }
    addStock(String(sa.code), amount, { direct: true, amount });
  }

  const denominator = totalAmount || 1;
  const topStocks = Array.from(stockExposureMap.values())
    .map((e) => ({ ...e, pct: (e.amount / denominator) * 100 }))
    .sort((a, b) => b.amount - a.amount);

  // 重仓预警 = 同一支股票被 2+ 只不同基金同时持有（按 fund_code 去重，
  // 避免同基金在多个账户/多条 source 重复计数造成误判）；按合计占比排序取头部。
  const duplicateHoldings = topStocks
    .map((s) => {
      const fundAgg = new Map<string, { fund_code: string; fund_name: string; amount: number }>();
      for (const src of s.sources) {
        if (!src.fund_code) continue;
        const existing = fundAgg.get(src.fund_code);
        if (existing) {
          existing.amount += src.amount;
        } else {
          fundAgg.set(src.fund_code, {
            fund_code: src.fund_code,
            fund_name: src.fund_name ?? src.fund_code,
            amount: src.amount,
          });
        }
      }
      return { stock: s, funds: Array.from(fundAgg.values()) };
    })
    .filter(({ funds }) => funds.length >= 2)
    .sort((a, b) => b.stock.pct - a.stock.pct)
    .map(({ stock, funds }) => ({
      stock_code: stock.stock_code,
      total_pct: stock.pct,
      total_amount: stock.amount,
      funds,
    }));

  const alerts: { level: "critical" | "warning" | "info"; title: string; message: string }[] = [];
  const top1Stock = topStocks[0];
  if (top1Stock && top1Stock.pct > 8) {
    // 无代码个股内部用 __nocode_<uuid> 占位，不能直接写到告警中（否则会泄露到分享页 / AI 上下文）。
    const displayCode = top1Stock.stock_code.startsWith("__nocode_") ? "未标注个股" : top1Stock.stock_code;
    alerts.push({
      level: top1Stock.pct > 15 ? "critical" : "warning",
      title: `${displayCode} 单票暴露过大`,
      message: `该个股加总权重 ${top1Stock.pct.toFixed(1)}%（含基金穿透与直接持股），单一个股风险明显。`,
    });
  }
  if (duplicateHoldings.length > 0) {
    alerts.push({
      level: "info",
      title: "多只基金重仓同一股票",
      message: `发现 ${duplicateHoldings.length} 只个股同时出现在 2+ 只基金中，表面上"分散持有多只基金"实际上并未分散。`,
    });
  }
  if (unmatched.length > 0) {
    alerts.push({
      level: "warning",
      title: "存在未穿透的基金持仓",
      message: `${unmatched.length} 只基金因缺代码或底稿未收录而未参与穿透，请留意其对整体集中度的隐性影响。`,
    });
  }
  if (denominator > 0 && cashAmount / denominator < 0.1) {
    alerts.push({
      level: "warning",
      title: "现金类资产偏低",
      message: `现金 + 存款仅占总资产 ${(cashAmount / denominator * 100).toFixed(1)}%，一旦极端行情或家庭现金流事件发生，缓冲有限。`,
    });
  }

  const snapshotStocks = topStocks.slice(0, 20).map((s) => ({
    stock_code: s.stock_code,
    amount: Number(s.amount.toFixed(2)),
    pct: Number(s.pct.toFixed(3)),
    sources: s.sources.map((x) => ({
      fund_code: x.fund_code ?? null,
      fund_name: x.fund_name ?? null,
      amount: Number(x.amount.toFixed(2)),
      direct: !!x.direct,
    })),
  }));

  // xray_reports 列结构保持不变（concentration_score / top_industry / industry_exposure 都是历史遗留列）：
  // 前端已不再消费它们，这里统一写入中性值即可，无需迁移表结构。
  const insertRes = await supabase
    .from("xray_reports")
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      fund_amount: fundAmount,
      stock_amount: stockAmount,
      cash_amount: cashAmount,
      concentration_score: 0,
      top_industry: null,
      top_industry_pct: null,
      industry_exposure: [],
      top_stocks: snapshotStocks,
      duplicate_holdings: duplicateHoldings,
      alerts,
      unmatched_funds: unmatched,
    })
    .select()
    .single();
  if (insertRes.error) {
    console.error("xray_insert_failed", insertRes.error);
    return jsonResponse({ error: "persist_failed" }, 500);
  }

  return jsonResponse({ report: insertRes.data });
});
