import { corsHeaders, jsonResponse } from "../_shared/auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

/**
 * 今日汇率获取：
 * 1) 先读 fx_rates 表，若最近一次刷新 < 24 小时且 11 币种齐全，直接返回缓存。
 * 2) 否则调 open.er-api.com 拉最新中间价（以 USD 为 base，稳健），换算成 rate_to_cny 后 upsert。
 * 3) 拉取失败时仍返回旧缓存（宁可用昨天的也不空手回）；表刚建好 + 外部失败时才回落 seed。
 */

const SUPPORTED = ["CNY","USD","HKD","EUR","GBP","JPY","SGD","KRW","TWD","AUD","CAD"] as const;
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface OpenErApiResponse {
  result: string;
  base_code: string;
  time_last_update_unix?: number;
  rates: Record<string, number>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return jsonResponse({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const existingRes = await supabase
      .from("fx_rates")
      .select("target_code, rate_to_cny, source, updated_at")
      .in("target_code", [...SUPPORTED]);

    if (existingRes.error) {
      console.error("fx_rates_read_failed", existingRes.error);
      return jsonResponse({ error: "read_failed" }, 500);
    }

    const rows = existingRes.data ?? [];
    const now = Date.now();
    const oldestMs = rows.length === 0 ? Infinity : Math.min(...rows.map((r) => now - new Date(String(r.updated_at)).getTime()));
    const complete = rows.length === SUPPORTED.length;
    // 完全未拉取过实时汇率（全部是 seed）时也强制刷新，避免新项目刚初始化就卡在参考值上。
    const hasRealSample = rows.some((r) => r.source !== "seed");
    const isFresh = complete && hasRealSample && oldestMs < REFRESH_INTERVAL_MS;

    if (isFresh) {
      return jsonResponse(buildResponse(rows));
    }

    // 拉今日中间价 —— open.er-api.com 免费无 key，每日更新
    let refreshed: { code: string; rate_to_cny: number }[] | null = null;
    try {
      const upstreamRes = await fetch("https://open.er-api.com/v6/latest/USD", {
        signal: AbortSignal.timeout(8_000),
      });
      if (upstreamRes.ok) {
        const data = (await upstreamRes.json()) as OpenErApiResponse;
        if (data.result === "success" && typeof data.rates?.CNY === "number" && data.rates.CNY > 0) {
          const cnyPerUsd = data.rates.CNY;
          const derived: { code: string; rate_to_cny: number }[] = [];
          for (const code of SUPPORTED) {
            if (code === "CNY") {
              derived.push({ code, rate_to_cny: 1 });
              continue;
            }
            const perUsd = data.rates[code];
            if (typeof perUsd === "number" && perUsd > 0) {
              // rate_to_cny = (1 CNY / X CODE) 反过来 = 1 CODE 值多少 CNY
              // 1 USD = perUsd CODE, 1 USD = cnyPerUsd CNY => 1 CODE = cnyPerUsd / perUsd CNY
              const rateToCny = cnyPerUsd / perUsd;
              if (Number.isFinite(rateToCny) && rateToCny > 0) {
                derived.push({ code, rate_to_cny: Number(rateToCny.toFixed(8)) });
              }
            }
          }
          if (derived.length === SUPPORTED.length) refreshed = derived;
        }
      } else {
        console.warn("fx_upstream_bad_status", upstreamRes.status);
      }
    } catch (err) {
      console.warn("fx_upstream_failed", err);
    }

    if (refreshed) {
      const upsertPayload = refreshed.map((r) => ({
        target_code: r.code,
        rate_to_cny: r.rate_to_cny,
        source: "open.er-api.com",
        updated_at: new Date().toISOString(),
      }));
      const upsertRes = await supabase
        .from("fx_rates")
        .upsert(upsertPayload, { onConflict: "target_code" })
        .select("target_code, rate_to_cny, source, updated_at");
      if (upsertRes.error) {
        console.error("fx_upsert_failed", upsertRes.error);
        // 缓存写失败但读到了外部数据，也直接返回内存里的最新版
        return jsonResponse(buildResponse(upsertPayload.map((p) => ({
          target_code: p.target_code, rate_to_cny: p.rate_to_cny,
          source: p.source, updated_at: p.updated_at,
        }))));
      }
      return jsonResponse(buildResponse(upsertRes.data ?? upsertPayload));
    }

    // 外部拉取失败：如果表里还有旧缓存（包括 seed），就返回旧缓存兜底
    if (rows.length > 0) {
      return jsonResponse({ ...buildResponse(rows), stale: true });
    }
    return jsonResponse({ error: "fx_unavailable" }, 502);
  } catch (err) {
    console.error("fx_unexpected", err);
    return jsonResponse({ error: "unexpected" }, 500);
  }
});

function buildResponse(rows: { target_code: string; rate_to_cny: number | string; source: string; updated_at: string }[]) {
  const rates: Record<string, number> = {};
  let latest = 0;
  let source = "seed";
  for (const row of rows) {
    rates[row.target_code] = Number(row.rate_to_cny);
    const ts = new Date(row.updated_at).getTime();
    if (ts > latest) {
      latest = ts;
      source = row.source;
    }
  }
  return {
    base: "CNY",
    rates,
    updated_at: latest > 0 ? new Date(latest).toISOString() : new Date(0).toISOString(),
    source,
  };
}
