import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const DEMO_ASSETS = [
  { name: "招商银行活期", category: "bank_deposit", platform: "招商银行", amount: 35000 },
  { name: "工行定期 1 年", category: "bank_deposit", platform: "工商银行", amount: 100000 },
  { name: "余额宝", category: "cash_management", platform: "支付宝", amount: 28000 },
  { name: "易方达蓝筹精选混合", category: "fund", platform: "蚂蚁财富", amount: 45000, code: "005827" },
  { name: "中欧医疗健康混合A", category: "fund", platform: "天天基金", amount: 30000, code: "003095" },
  { name: "招商中证白酒指数", category: "fund", platform: "蚂蚁财富", amount: 25000, code: "161725" },
  { name: "广发科技先锋混合", category: "fund", platform: "蚂蚁财富", amount: 35000, code: "008903" },
  { name: "华夏沪深300ETF联接A", category: "fund", platform: "天天基金", amount: 50000, code: "000051" },
  { name: "贵州茅台", category: "stock", platform: "同花顺", amount: 42000, code: "600519" },
  { name: "宁德时代", category: "stock", platform: "同花顺", amount: 38000, code: "300750" },
  { name: "中国平安寿险", category: "insurance", platform: "平安保险", amount: 60000 },
  { name: "微信零钱通", category: "cash_management", platform: "微信", amount: 15000 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonResponse({ error: "missing_token" }, 401);
    const userRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
      headers: { apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "", Authorization: authHeader },
    });
    if (!userRes.ok) return jsonResponse({ error: "invalid_token" }, 401);
    const { id: userId } = await userRes.json();
    if (!userId) return jsonResponse({ error: "no_user" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 由数据库层的部分唯一索引（每人只能有一条 demo 批次）来保证原子幂等
    const { data: batch, error: batchErr } = await admin
      .from("import_batches")
      .insert({
        user_id: userId,
        source: "demo",
        status: "pending",
        note: "载入演示用户小王：12 项资产，覆盖 5 个平台",
      })
      .select("id")
      .single();

    if (batchErr) {
      // 唯一约束冲突：已有 demo 批次，直接返回旧结果，不重复插入资产
      if (batchErr.code === "23505") {
        const { data: existing } = await admin
          .from("import_batches")
          .select("id, imported_count")
          .eq("user_id", userId)
          .eq("source", "demo")
          .maybeSingle();
        return jsonResponse({ status: "already_loaded", batchId: existing?.id ?? null, imported: existing?.imported_count ?? DEMO_ASSETS.length });
      }
      return jsonResponse({ error: batchErr.message }, 500);
    }
    if (!batch) return jsonResponse({ error: "batch_insert_failed" }, 500);

    const inserts = DEMO_ASSETS.map((row) => ({
      user_id: userId,
      name: row.name,
      category: row.category,
      platform: row.platform,
      amount: row.amount,
      code: row.code ?? null,
      source: "demo",
      batch_id: batch.id,
    }));

    const { error: insertErr } = await admin.from("assets").insert(inserts);
    if (insertErr) {
      // 回滚批次记录，避免残留 pending 幽灵
      await admin.from("import_batches").delete().eq("id", batch.id);
      return jsonResponse({ error: insertErr.message }, 500);
    }

    const { error: updateErr } = await admin
      .from("import_batches")
      .update({ status: "imported", imported_count: inserts.length })
      .eq("id", batch.id)
      .eq("user_id", userId);
    if (updateErr) {
      return jsonResponse({ error: updateErr.message }, 500);
    }

    return jsonResponse({ status: "loaded", batchId: batch.id, imported: inserts.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
