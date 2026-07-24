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
  stock_name: string;
  industry: string;
  weight: number;
}
/** 前端预拉取的实时重仓条目（来自行情后端 /get_fund_zc，只有代码 + 权重）。 */
interface LiveHoldingItem {
  stock_code: string;
  weight: number;
}
interface StockExposure {
  stock_code: string;
  stock_name: string;
  industry: string;
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
    console.debug("[xray-debug] edge 收到 body.live_holdings 原始值:", JSON.stringify(raw));
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [fundCode, items] of Object.entries(raw as Record<string, unknown>)) {
        if (!Array.isArray(items)) {
          console.debug(`[xray-debug] edge 基金 ${fundCode} 的 items 不是数组，跳过:`, items);
          continue;
        }
        const valid: LiveHoldingItem[] = [];
        for (const it of items) {
          const rec = it as Record<string, unknown> | null;
          const stockCode = String(rec?.stock_code ?? "").trim();
          const weight = Number(rec?.weight);
          if (!stockCode || !Number.isFinite(weight) || weight <= 0) {
            console.debug(
              `[xray-debug] edge 基金 ${fundCode} 丢弃脏条目: stock_code=${JSON.stringify(rec?.stock_code)}, weight=${JSON.stringify(rec?.weight)}(→${weight})`,
            );
            continue;
          }
          valid.push({ stock_code: stockCode, weight });
        }
        console.debug(`[xray-debug] edge 基金 ${fundCode} 校验后保留 ${valid.length}/${items.length} 条实时重仓`);
        if (valid.length > 0) liveHoldingsMap.set(String(fundCode), valid);
      }
    } else {
      console.debug("[xray-debug] edge live_holdings 形状不符合预期（非对象或为数组），当作无实时数据");
    }
  } catch (err) {
    // 无 body 或 JSON 解析失败：当作没有实时数据，继续走静态底稿。
    console.debug("[xray-debug] edge body JSON 解析失败，当作无实时数据:", err);
  }
  console.debug(
    `[xray-debug] edge 最终 liveHoldingsMap 命中基金数=${liveHoldingsMap.size}, keys=`,
    Array.from(liveHoldingsMap.keys()),
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  try {
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
    const stockCodes = Array.from(new Set(stockAssets.map((a) => a.code).filter(Boolean).map(String)));

    // 实时重仓的底层股票也要一并解析行业（命中不了的穿透时归「其他」）。
    const liveStockCodes = Array.from(new Set(
      Array.from(liveHoldingsMap.values()).flat().map((h) => h.stock_code),
    ));
    const allStockCodes = Array.from(new Set([...stockCodes, ...liveStockCodes]));
    // 已有实时重仓的基金不再查静态底稿，底稿只作为未命中基金的回退。
    const fallbackFundCodes = fundCodes.filter((c) => !liveHoldingsMap.has(c));

    console.debug(
      `[xray-debug] edge 资产统计: 总资产=${assets.length}, 基金=${fundAssets.length}, 股票=${stockAssets.length}`,
    );
    console.debug("[xray-debug] edge fundCodes:", fundCodes);
    console.debug("[xray-debug] edge stockCodes:", stockCodes);
    console.debug("[xray-debug] edge liveStockCodes(实时重仓底层股):", liveStockCodes);
    console.debug("[xray-debug] edge fallbackFundCodes(需查静态底稿的基金):", fallbackFundCodes);

    const [mastersRes, holdingsRes, industriesRes] = await Promise.all([
      supabase.from("fund_master").select("fund_code, fund_name")
        .in("fund_code", fundCodes.length ? fundCodes : ["__none__"]),
      supabase.from("fund_holdings").select("fund_code, stock_code, stock_name, industry, weight")
        .in("fund_code", fallbackFundCodes.length ? fallbackFundCodes : ["__none__"]),
      supabase.from("stock_industry").select("stock_code, stock_name, industry")
        .in("stock_code", allStockCodes.length ? allStockCodes : ["__none__"]),
    ]);
    if (mastersRes.error || holdingsRes.error || industriesRes.error) {
      console.error("xray_reference_load_failed", mastersRes.error, holdingsRes.error, industriesRes.error);
      return jsonResponse({ error: "reference_load_failed" }, 500);
    }

    const masterMap = new Map<string, string>((mastersRes.data ?? [])
      .map((m: { fund_code: string; fund_name: string }) => [m.fund_code, m.fund_name]));
    const holdingsMap = new Map<string, FundHolding[]>();
    for (const h of (holdingsRes.data ?? []) as FundHolding[]) {
      if (!holdingsMap.has(h.fund_code)) holdingsMap.set(h.fund_code, []);
      holdingsMap.get(h.fund_code)!.push(h);
    }
    const industryMap = new Map<string, { name: string; industry: string }>(
      (industriesRes.data ?? []).map((s: { stock_code: string; stock_name: string; industry: string }) => [s.stock_code, { name: s.stock_name, industry: s.industry }]),
    );

    console.debug(
      `[xray-debug] edge 参考表加载: fund_master=${masterMap.size} 条, fund_holdings(静态底稿)=${holdingsMap.size} 只基金, stock_industry=${industryMap.size} 条`,
    );
    console.debug("[xray-debug] edge holdingsMap 静态底稿覆盖基金:", Array.from(holdingsMap.keys()));
    console.debug("[xray-debug] edge industryMap 已解析股票代码:", Array.from(industryMap.keys()));

    const stockExposureMap = new Map<string, StockExposure>();
    const industryExposureMap = new Map<string, number>();
    const unmatched: { code: string | null; name: string; amount: number; reason: string }[] = [];

    const addStock = (
      code: string,
      name: string,
      industry: string,
      amount: number,
      source: StockExposure["sources"][number],
    ) => {
      let entry = stockExposureMap.get(code);
      if (!entry) {
        entry = { stock_code: code, stock_name: name, industry, amount: 0, pct: 0, sources: [] };
        stockExposureMap.set(code, entry);
      }
      entry.amount += amount;
      entry.sources.push(source);
      industryExposureMap.set(industry, (industryExposureMap.get(industry) ?? 0) + amount);
    };

    // 基金穿透优先级：实时重仓（前端预拉取）> 静态底稿 fund_holdings > 未收录。
    // 披露的权重摊到底层个股；未披露残值 + 无代码/未收录基金 → 未知底层。
    for (const fa of fundAssets) {
      const amount = toBaseAmount(fa.amount, fa.currency);
      if (!fa.code) {
        console.debug(`[xray-debug] edge 基金 "${fa.name}" 无代码 → 未穿透（未知底层）`);
        unmatched.push({ code: null, name: fa.name, amount, reason: "无基金代码" });
        industryExposureMap.set("未知底层", (industryExposureMap.get("未知底层") ?? 0) + amount);
        continue;
      }
      const code = String(fa.code);
      const fundName = masterMap.get(code) ?? fa.name;

      const liveItems = liveHoldingsMap.get(code);
      let items: FundHolding[];
      if (liveItems) {
        console.debug(`[xray-debug] edge 基金 ${code}(${fundName}) → 使用实时重仓 ${liveItems.length} 条`);
        // 实时重仓只有代码 + 权重；名称/行业用 stock_industry 解析，查不到归「其他」。
        items = liveItems.map((h) => {
          const info = industryMap.get(h.stock_code);
          return {
            fund_code: code,
            stock_code: h.stock_code,
            stock_name: info?.name ?? h.stock_code,
            industry: info?.industry ?? "其他",
            weight: h.weight,
          };
        });
      } else {
        items = holdingsMap.get(code) ?? [];
        console.debug(
          `[xray-debug] edge 基金 ${code}(${fundName}) → 无实时重仓，回退静态底稿命中 ${items.length} 条`,
        );
      }

      if (items.length === 0) {
        console.debug(`[xray-debug] edge 基金 ${code}(${fundName}) → 未穿透（实时+底稿都为空），金额=${amount}`);
        unmatched.push({ code, name: fundName, amount, reason: "实时重仓不可用且底稿未收录" });
        industryExposureMap.set("未知底层", (industryExposureMap.get("未知底层") ?? 0) + amount);
        continue;
      }
      let disclosedWeight = 0;
      for (const h of items) disclosedWeight += Number(h.weight);
      disclosedWeight = Math.min(100, disclosedWeight);
      console.debug(
        `[xray-debug] edge 基金 ${code}(${fundName}) → 穿透成功，披露权重合计=${disclosedWeight}%，底层股票 ${items.length} 只`,
      );
      for (const h of items) {
        const stockAmount = amount * (Number(h.weight) / 100);
        addStock(h.stock_code, h.stock_name, h.industry, stockAmount, {
          fund_code: code,
          fund_name: fundName,
          amount: stockAmount,
        });
      }
      const residualPct = Math.max(0, 100 - disclosedWeight);
      if (residualPct > 0) {
        const residualAmount = amount * (residualPct / 100);
        industryExposureMap.set("未知底层", (industryExposureMap.get("未知底层") ?? 0) + residualAmount);
      }
    }

    // 股票：优先用预置行业；预置不到走"其他"；无代码用 sa.name 作为占位（隐私由 create-shared-report 侧脱敏兜底）
    for (const sa of stockAssets) {
      const amount = toBaseAmount(sa.amount, sa.currency);
      if (!sa.code) {
        // 无代码个股：用一个稳定的占位 code，避免与他人合并；industry = 其他
        const placeholder = `__nocode_${sa.id}`;
        addStock(placeholder, sa.name, "其他", amount, { direct: true, amount });
        continue;
      }
      const code = String(sa.code);
      const info = industryMap.get(code);
      const industry = info?.industry ?? "其他";
      const name = info?.name ?? sa.name;
      addStock(code, name, industry, amount, { direct: true, amount });
    }

    const denominator = totalAmount || 1;
    const topStocks = Array.from(stockExposureMap.values())
      .map((e) => ({ ...e, pct: (e.amount / denominator) * 100 }))
      .sort((a, b) => b.amount - a.amount);

    const industryExposure = Array.from(industryExposureMap.entries())
      .map(([industry, amount]) => ({ industry, amount, pct: (amount / denominator) * 100 }))
      .sort((a, b) => b.amount - a.amount);

    const duplicateHoldings = topStocks
      .filter((s) => s.sources.filter((x) => x.fund_code).length >= 2)
      .map((s) => ({
        stock_code: s.stock_code,
        stock_name: s.stock_name,
        industry: s.industry,
        total_pct: s.pct,
        total_amount: s.amount,
        funds: s.sources.filter((x) => x.fund_code).map((x) => ({
          fund_code: x.fund_code!,
          fund_name: x.fund_name!,
          amount: x.amount,
        })),
      }));

    const topIndustry = industryExposure[0];
    const topThreePct = industryExposure.slice(0, 3).reduce((s, i) => s + i.pct, 0);
    const concentrationScore = Math.min(100, Math.round(topThreePct * 100) / 100);

    console.debug(
      `[xray-debug] edge 穿透汇总: 个股 ${topStocks.length} 只, 行业 ${industryExposure.length} 类, 未穿透基金 ${unmatched.length} 只`,
    );
    console.debug("[xray-debug] edge unmatched(未穿透明细):", unmatched);
    console.debug("[xray-debug] edge industryExposure(含未知底层):", industryExposure);

    const alerts: { level: "critical" | "warning" | "info"; title: string; message: string }[] = [];
    if (topIndustry && topIndustry.pct > 25) {
      alerts.push({
        level: topIndustry.pct > 40 ? "critical" : "warning",
        title: `${topIndustry.industry}行业暴露过高`,
        message: `你的组合中${topIndustry.industry}实际权重达 ${topIndustry.pct.toFixed(1)}%，穿透后的集中度显著高于表面上分散的印象。`,
      });
    }
    const top1Stock = topStocks[0];
    if (top1Stock && top1Stock.pct > 8) {
      alerts.push({
        level: top1Stock.pct > 15 ? "critical" : "warning",
        title: `${top1Stock.stock_name}单票暴露过大`,
        message: `${top1Stock.stock_name}加总权重 ${top1Stock.pct.toFixed(1)}%（含基金穿透与直接持股），单一个股风险明显。`,
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
        message: `${unmatched.length} 只基金因缺代码或底稿未收录而未参与穿透，其权重已计入"未知底层"以避免低估集中度。`,
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
      stock_name: s.stock_name,
      industry: s.industry,
      amount: Number(s.amount.toFixed(2)),
      pct: Number(s.pct.toFixed(3)),
      sources: s.sources.map((x) => ({
        fund_code: x.fund_code ?? null,
        fund_name: x.fund_name ?? null,
        amount: Number(x.amount.toFixed(2)),
        direct: !!x.direct,
      })),
    }));

    const snapshotIndustry = industryExposure.slice(0, 15).map((i) => ({
      industry: i.industry,
      amount: Number(i.amount.toFixed(2)),
      pct: Number(i.pct.toFixed(3)),
    }));

    const insertRes = await supabase
      .from("xray_reports")
      .insert({
        user_id: userId,
        total_amount: totalAmount,
        fund_amount: fundAmount,
        stock_amount: stockAmount,
        cash_amount: cashAmount,
        concentration_score: concentrationScore,
        top_industry: topIndustry?.industry ?? null,
        top_industry_pct: topIndustry?.pct ?? null,
        industry_exposure: snapshotIndustry,
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
  } catch (err) {
    console.error("xray_unexpected", err);
    return jsonResponse({ error: "unexpected" }, 500);
  }
});
