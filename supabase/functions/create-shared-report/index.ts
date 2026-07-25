import { corsHeaders, jsonResponse, requireUser, serviceClient } from "../_shared/auth.ts";
import { toBaseAmount } from "../_shared/currency.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const MAX_VALID_DAYS = 30;
const MIN_VALID_DAYS = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, jwt } = auth;

  const body = await req.json().catch(() => ({}));
  const action: string = body?.action === "revoke" ? "revoke" : "create";

  const svc = serviceClient();

  if (action === "revoke") {
    const id: string = body?.id;
    if (!id || typeof id !== "string") return jsonResponse({ error: "missing_id" }, 400);
    const { error } = await svc
      .from("shared_reports")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.error("share_revoke_failed", error);
      return jsonResponse({ error: "revoke_failed" }, 500);
    }
    return jsonResponse({ ok: true });
  }

  const rawDays = body?.valid_days;
  let validDays = 7;
  if (rawDays !== undefined && rawDays !== null) {
    const n = Number(rawDays);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return jsonResponse({ error: "invalid_valid_days" }, 400);
    }
    if (n < MIN_VALID_DAYS || n > MAX_VALID_DAYS) {
      return jsonResponse({ error: "invalid_valid_days", min: MIN_VALID_DAYS, max: MAX_VALID_DAYS }, 400);
    }
    validDays = n;
  }
  const title: string = String(body?.title ?? "季度资产体检报告").slice(0, 80);

  // 用 anon 客户端（带 JWT）拉本用户数据；受 RLS 保护
  const rls = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const [assetsRes, xrayRes, stressLatestRes, profileRes] = await Promise.all([
    rls.from("assets").select("id, name, category, platform, amount, currency").eq("user_id", userId).order("created_at", { ascending: false }),
    rls.from("xray_reports").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    rls.from("stress_test_runs").select("run_id, created_at").eq("user_id", userId).not("run_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    rls.from("user_profiles").select("monthly_expense").eq("user_id", userId).maybeSingle(),
  ]);
  if (assetsRes.error || xrayRes.error || stressLatestRes.error || profileRes.error) {
    console.error("share_load_failed", assetsRes.error, xrayRes.error, stressLatestRes.error, profileRes.error);
    return jsonResponse({ error: "load_failed" }, 500);
  }
  const assets = (assetsRes.data ?? []) as {
    id: string; name: string; category: string; platform: string | null; amount: number; currency: string | null;
  }[];
  if (assets.length === 0) return jsonResponse({ error: "no_assets" }, 400);

  let stressGroup: Record<string, unknown>[] = [];
  if (stressLatestRes.data?.run_id) {
    const sr = await rls.from("stress_test_runs")
      .select("scenario, scenario_label, estimated_loss, loss_pct, recovery_days, emergency_months, detail, created_at")
      .eq("user_id", userId).eq("run_id", stressLatestRes.data.run_id);
    if (sr.error) {
      console.error("share_stress_group_failed", sr.error);
      return jsonResponse({ error: "load_failed" }, 500);
    }
    stressGroup = sr.data ?? [];
  }

  // 汇总金额均按参考汇率折算为人民币等值；明细的逐条 items 保留原币金额与币种，供分享页按币种符号展示。
  const total = assets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
  const byCategory: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const a of assets) {
    const cny = toBaseAmount(a.amount, a.currency);
    byCategory[a.category] = (byCategory[a.category] ?? 0) + cny;
    const p = a.platform ?? "未标注";
    byPlatform[p] = (byPlatform[p] ?? 0) + cny;
  }

  const snapshot = {
    title,
    generated_at: new Date().toISOString(),
    portfolio: {
      total,
      count: assets.length,
      byCategory,
      byPlatform,
      items: assets.map((a) => ({
        name: maskName(a.name),
        category: a.category,
        platform: a.platform,
        amount: Number(a.amount),
        currency: (a.currency || "CNY").toUpperCase(),
      })),
    },
    xray: xrayRes.data ? sanitizeXray(xrayRes.data as Record<string, unknown>) : null,
    stress_tests: stressGroup.map(sanitizeStress),
    profile: {
      monthly_expense: Number(profileRes.data?.monthly_expense ?? 15000),
    },
  };

  const slug = generateSlug(); // 26 位 base32，>128 位熵
  const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

  const insertRes = await svc.from("shared_reports").insert({
    user_id: userId,
    title,
    snapshot,
    slug,
    expires_at: expiresAt.toISOString(),
  }).select("id, slug, expires_at, created_at, title").single();
  if (insertRes.error) {
    console.error("share_insert_failed", insertRes.error);
    return jsonResponse({ error: "persist_failed" }, 500);
  }

  return jsonResponse({ report: insertRes.data });
});

function generateSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789"; // base32 without confusing chars
  const buf = new Uint8Array(26);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => alphabet[b % alphabet.length]).join("");
}

function maskName(name: string): string {
  if (!name) return "";
  const n = name.trim();
  if (n.length === 0) return "";
  if (n.length === 1) return "*";
  if (n.length === 2) return n[0] + "*";
  if (n.length <= 6) return n.slice(0, 1) + "*".repeat(n.length - 2) + n.slice(-1);
  return n.slice(0, 2) + "*".repeat(Math.min(3, n.length - 4)) + n.slice(-2);
}

/** 兼容旧报告：把内部 `__nocode_<uuid>` 与显示不出来的空值都收敛为 “—”。 */
function safeStockCode(code: unknown): string {
  const s = String(code ?? "").trim();
  if (!s || s.startsWith("__nocode_")) return "—";
  return s;
}

/**
 * 历史遗留兼容：
 * - 旧 alerts 可能包含“XX 行业暴露过高”——行业维度已从产品中去除，分享页也不再展示；
 * - 旧告警标题/正文中可能包含内部占位 `__nocode_<uuid>`，属于隐私泄露，必须脱敏。
 */
function sanitizeAlerts(alerts: unknown[]): unknown[] {
  const NOCODE = /__nocode_[a-f0-9-]+/g;
  return alerts
    .map((a) => a as { level?: string; title?: string; message?: string })
    .filter((a) => !/行业/.test(String(a.title ?? "")) && !/行业/.test(String(a.message ?? "")))
    .map((a) => ({
      level: a.level,
      title: String(a.title ?? "").replace(NOCODE, "未标注个股"),
      message: String(a.message ?? "").replace(NOCODE, "未标注个股"),
    }));
}

function sanitizeXray(x: Record<string, unknown>): Record<string, unknown> {
  const top_stocks = (x.top_stocks as { stock_code?: string; amount: number; pct: number; sources: { fund_code?: string | null; fund_name?: string | null; direct?: boolean; amount: number }[] }[] | undefined) ?? [];
  const duplicate_holdings = (x.duplicate_holdings as { stock_code?: string; total_pct: number; total_amount: number; funds: { fund_code: string; fund_name: string; amount: number }[] }[] | undefined) ?? [];
  const alerts = (x.alerts as unknown[] | undefined) ?? [];
  return {
    created_at: x.created_at,
    total_amount: Number(x.total_amount),
    // 分享页只展示代码 + 权重，个股名称由分享页后续自己按 code 查。
    // 无代码 / 占位 code / 旧 snapshot 无 stock_code 字段，均统一呈现为 “—”。
    top_stocks: top_stocks.map((s) => ({
      stock_code: safeStockCode(s.stock_code),
      amount: s.amount,
      pct: s.pct,
      sources: s.sources.map((src) => ({
        fund_name: src.fund_name ?? null,
        direct: !!src.direct,
        amount: src.amount,
      })),
    })),
    duplicate_holdings: duplicate_holdings.map((d) => ({
      stock_code: safeStockCode(d.stock_code),
      total_pct: d.total_pct,
      total_amount: d.total_amount,
      funds: d.funds.map((f) => ({ fund_name: f.fund_name, amount: f.amount })),
    })),
    alerts: sanitizeAlerts(alerts),
  };
}

function sanitizeStress(r: Record<string, unknown>): Record<string, unknown> {
  return {
    scenario: r.scenario,
    scenario_label: r.scenario_label,
    estimated_loss: Number(r.estimated_loss),
    loss_pct: Number(r.loss_pct),
    recovery_days: r.recovery_days,
    emergency_months: r.emergency_months,
    detail: {
      desc: (r.detail as Record<string, unknown> | null)?.desc ?? null,
      summary: (r.detail as Record<string, unknown> | null)?.summary ?? null,
      breakdown: ((r.detail as { breakdown?: unknown[] } | null)?.breakdown ?? []).slice(0, 8),
    },
    created_at: r.created_at,
  };
}
