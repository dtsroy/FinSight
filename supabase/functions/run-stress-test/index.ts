import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";
import { toBaseAmount } from "../_shared/currency.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

interface AssetRow { id: string; name: string; category: string; amount: number; currency: string | null; code: string | null }

interface ScenarioTemplate {
  key: string;
  label: string;
  desc: string;
  recovery_days: number;
  /**
   * 按大类的下跌比例（0-1）。所有情景都以资产大类为单位施加冲击，
   * 不再依赖任何"股票→行业"的映射数据。缺省资产大类使用 `other` 兜底。
   */
  drops: Record<string, number>;
  /** 失业类情景的资产折价率（沿用旧字段以保持数据结构不变）。 */
  category_drops?: Record<string, number>;
}

const CATEGORY_LABEL: Record<string, string> = {
  stock: "股票",
  fund: "基金",
  bond: "债券",
  insurance: "保险",
  cash_management: "现金理财",
  bank_deposit: "存款",
  other: "其他",
};

const SCENARIOS: ScenarioTemplate[] = [
  {
    key: "crash_2015",
    label: "2015 股灾",
    desc: "2015 年 6-8 月 A 股急速下跌，权益类资产（股票 / 偏股基金）冲击最大，固收类相对稳。",
    recovery_days: 720,
    drops: {
      stock: 0.55,
      fund: 0.50,
      bond: 0.05,
      insurance: 0.05,
      cash_management: 0.02,
      bank_deposit: 0,
      other: 0.30,
    },
  },
  {
    key: "pandemic_2020",
    label: "2020 疫情熔断",
    desc: "2020 年 3 月全球风险资产急跌，股票基金短期回撤明显，之后快速修复。",
    recovery_days: 210,
    drops: {
      stock: 0.20,
      fund: 0.18,
      bond: 0.03,
      insurance: 0.05,
      cash_management: 0.01,
      bank_deposit: 0,
      other: 0.15,
    },
  },
  {
    key: "bear_2022",
    label: "2022 熊市",
    desc: "2022 年全年新能源、消费板块显著回调，港股跌幅更大；权益类整体承压。",
    recovery_days: 540,
    drops: {
      stock: 0.28,
      fund: 0.30,
      bond: 0.02,
      insurance: 0.03,
      cash_management: 0.01,
      bank_deposit: 0,
      other: 0.20,
    },
  },
  {
    key: "job_loss",
    label: "失业+急用钱",
    desc: "假设失业 6 个月，且期间需要一次性支出 5 万元（急用钱）。",
    recovery_days: 0,
    drops: {},
    category_drops: { stock: 0.1, fund: 0.1, bond: 0.05, insurance: 0.3 },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, jwt } = auth;

  const body = await req.json().catch(() => ({}));
  const requestedScenarios: string[] = Array.isArray(body?.scenarios) && body.scenarios.length
    ? body.scenarios.filter((s: unknown) => typeof s === "string")
    : SCENARIOS.map((s) => s.key);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  try {
    const [assetsRes, profileRes] = await Promise.all([
      supabase.from("assets").select("id, name, category, amount, currency, code").eq("user_id", userId),
      supabase.from("user_profiles").select("monthly_expense").eq("user_id", userId).maybeSingle(),
    ]);
    if (assetsRes.error) {
      console.error("stress_assets_failed", assetsRes.error);
      return jsonResponse({ error: "load_failed" }, 500);
    }
    if (profileRes.error) {
      console.error("stress_profile_failed", profileRes.error);
      return jsonResponse({ error: "load_failed" }, 500);
    }
    const assets = (assetsRes.data ?? []) as AssetRow[];
    if (assets.length === 0) {
      return jsonResponse({ error: "no_assets", message: "尚未导入任何资产，无法进行压力测试" }, 400);
    }
    const monthlyExpense = Number(profileRes.data?.monthly_expense ?? 15000);

    // 跨币种先折算为人民币等值再进行情景模拟。
    const totalAmount = assets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
    const cashAmount = assets
      .filter((a) => a.category === "bank_deposit" || a.category === "cash_management")
      .reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);

    // 按大类汇总资产，作为所有情景共用的冲击基准。
    const categoryAmount: Record<string, number> = {};
    for (const a of assets) {
      const amt = toBaseAmount(a.amount, a.currency);
      categoryAmount[a.category] = (categoryAmount[a.category] ?? 0) + amt;
    }

    const runId = crypto.randomUUID();
    const outputs: Record<string, unknown>[] = [];

    for (const key of requestedScenarios) {
      const s = SCENARIOS.find((x) => x.key === key);
      if (!s) continue;
      let estimatedLoss = 0;
      const breakdown: { key: string; label: string; before: number; after: number; loss: number }[] = [];

      if (s.key === "job_loss") {
        const monthsNeeded = 6;
        const totalNeed = monthsNeeded * monthlyExpense + 50000;
        const cashCover = Math.max(0, Math.min(cashAmount, totalNeed));
        const shortfall = Math.max(0, totalNeed - cashCover);
        let sourced = shortfall;
        for (const [cat, dropPct] of Object.entries(s.category_drops ?? {})) {
          if (sourced <= 0) break;
          const catAssets = assets.filter((a) => a.category === cat);
          const catTotal = catAssets.reduce((sum, a) => sum + toBaseAmount(a.amount, a.currency), 0);
          if (catTotal <= 0) continue;
          const take = Math.min(catTotal, sourced);
          const loss = take * dropPct;
          estimatedLoss += loss;
          breakdown.push({ key: cat, label: CATEGORY_LABEL[cat] ?? cat, before: catTotal, after: catTotal - take, loss });
          sourced -= take;
        }
        const emergencyMonths = monthlyExpense > 0 ? cashAmount / monthlyExpense : 0;
        const summary = shortfall === 0
          ? `应急金完全覆盖 6 个月失业期加 5 万元急用支出，无需动用投资资产。`
          : emergencyMonths < 6
            ? `应急金仅够 ${emergencyMonths.toFixed(1)} 个月，必须动用投资类资产折价变现，损失约 ${(estimatedLoss / 10000).toFixed(1)} 万。`
            : `应急金可覆盖失业 ${emergencyMonths.toFixed(1)} 个月，剩余急用支出需动用少量投资资产变现。`;
        outputs.push({
          user_id: userId,
          run_id: runId,
          scenario: s.key,
          scenario_label: s.label,
          estimated_loss: Number(estimatedLoss.toFixed(2)),
          loss_pct: Number((estimatedLoss / (totalAmount || 1) * 100).toFixed(3)),
          recovery_days: null,
          emergency_months: Number(emergencyMonths.toFixed(2)),
          detail: {
            desc: s.desc,
            monthly_expense: monthlyExpense,
            total_need: Number(totalNeed.toFixed(2)),
            cash_cover: Number(cashCover.toFixed(2)),
            shortfall: Number(shortfall.toFixed(2)),
            breakdown,
            summary,
          },
        });
        continue;
      }

      for (const [cat, amount] of Object.entries(categoryAmount)) {
        const dropPct = s.drops[cat] ?? s.drops.other ?? 0.25;
        if (amount <= 0) continue;
        const loss = amount * dropPct;
        estimatedLoss += loss;
        breakdown.push({
          key: cat,
          label: CATEGORY_LABEL[cat] ?? cat,
          before: amount,
          after: amount * (1 - dropPct),
          loss,
        });
      }
      breakdown.sort((a, b) => b.loss - a.loss);

      outputs.push({
        user_id: userId,
        run_id: runId,
        scenario: s.key,
        scenario_label: s.label,
        estimated_loss: Number(estimatedLoss.toFixed(2)),
        loss_pct: Number((estimatedLoss / (totalAmount || 1) * 100).toFixed(3)),
        recovery_days: s.recovery_days,
        emergency_months: null,
        detail: {
          desc: s.desc,
          breakdown: breakdown.slice(0, 10),
        },
      });
    }

    const insertRes = await supabase.from("stress_test_runs").insert(outputs).select();
    if (insertRes.error) {
      console.error("stress_insert_failed", insertRes.error);
      return jsonResponse({ error: "persist_failed" }, 500);
    }
    return jsonResponse({ runs: insertRes.data, run_id: runId, monthly_expense: monthlyExpense });
  } catch (err) {
    console.error("stress_unexpected", err);
    return jsonResponse({ error: "unexpected" }, 500);
  }
});
