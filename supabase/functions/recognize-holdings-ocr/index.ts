import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  detectCurrencyFromAmount,
  normalizeAmount,
  normalizeCategory,
  normalizeCurrency,
  ParsedAssetRow,
} from "../_shared/asset-normalize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const SYSTEM_PROMPT = `你是一位资深理财助手，负责从投资 App 的持仓截图中提取资产信息。
你只输出 JSON，不要额外解释。JSON 结构必须为:
{"rows":[{"name":"资产名称","category":"bank_deposit|stock|fund|bond|insurance|cash_management|other","platform":"所在平台或 App，如招商银行/蚂蚁财富/同花顺/微信/富途/老虎证券","amount":当前市值数字，仅数字,"currency":"币种 ISO 代码 CNY/USD/HKD/EUR/GBP/JPY/SGD/KRW/TWD/AUD/CAD","code":"基金或股票代码，无则填空字符串","note":"其他有价值的备注，可空"}]}
- 金额只保留纯数字，不要 ¥、$、千分位逗号或任何货币符号。
- currency：每一行必须独立判断，允许同一张截图出现多种币种。根据金额前后的符号或币种字样判断：
  · ¥ / ￥ / 元 / 人民币 → CNY
  · $ / US$ / USD → USD
  · HK$ / 港元 / 港币 → HKD
  · € / EUR → EUR
  · £ / GBP → GBP
  · JP¥ / 日元 → JPY
  · S$ / SGD → SGD
  · NT$ / 新台币 / 台币 → TWD
  · ₩ / KRW → KRW
  · A$ / AUD → AUD
  · C$ / CAD → CAD
  currency 必须写英文 ISO 代码，永远不要写符号本身。识别不到时填 CNY。
- 若截图里看不到某字段，用空字符串或省略。
- 严格输出 JSON，不要 Markdown 代码块。`;

interface AiRow {
  name?: string;
  category?: string;
  platform?: string;
  amount?: string | number;
  currency?: unknown;
  code?: string;
  note?: string;
}

function ownsImage(imageUrl: string, userId: string): boolean {
  try {
    const parsed = new URL(imageUrl);
    const decoded = decodeURIComponent(parsed.pathname);
    return decoded.includes(`/xray/${userId}/screenshots/`);
  } catch {
    return false;
  }
}

function extractJson(text: string): { rows?: AiRow[] } | null {
  if (!text) return null;
  const stripped = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  const candidate = stripped.slice(start, end + 1);
  try {
    const value = JSON.parse(candidate);
    if (typeof value !== "object" || value === null) return null;
    return value as { rows?: AiRow[] };
  } catch {
    return null;
  }
}

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

    const { imageUrl, platformHint } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") return jsonResponse({ error: "missing_image" }, 400);
    if (!ownsImage(imageUrl, userId)) {
      return jsonResponse({ error: "image_not_owned", detail: "OCR 只处理你上传到本项目对象存储的截图" }, 403);
    }

    const apiKey = Deno.env.get("SUPERUN_API_KEY");
    if (!apiKey) return jsonResponse({ error: "ai_not_configured" }, 500);

    const aiResp = await fetch("https://gateway.superun.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "superun-vision-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `请从截图中识别持仓${platformHint ? `（来源：${platformHint}）` : ""}。同时判断金额的币种。` },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      return jsonResponse({ error: "ai_failed", detail: errText }, 502);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);

    if (!parsed || !Array.isArray(parsed.rows)) {
      return jsonResponse({ rows: [], summary: { total: 0, valid: 0, invalid: 0 }, note: "AI 未能从截图中提取到可用的持仓数据" });
    }

    const rows: ParsedAssetRow[] = parsed.rows.map((row) => {
      const name = (row?.name ?? "").toString().trim();
      const platform = (row?.platform ?? platformHint ?? "").toString().trim();
      const rawAmount = row?.amount as string | number | undefined;
      const amount = normalizeAmount(rawAmount) ?? 0;
      const category = normalizeCategory((row?.category ?? "").toString(), name) ?? "other";
      // 币种优先级：AI 显式返回（可能是字符串/数字/对象）→ 金额符号推断 → 默认 CNY
      const explicit = row?.currency !== undefined && row?.currency !== null && row?.currency !== ""
        ? normalizeCurrency(row.currency)
        : null;
      const currency = explicit ?? detectCurrencyFromAmount(String(rawAmount ?? "")) ?? "CNY";
      const errors: string[] = [];
      if (!name) errors.push("缺少资产名称");
      if (!platform) errors.push("缺少所在平台");
      if (amount <= 0) errors.push("金额缺失或为 0，请手动补充");
      return {
        name,
        platform,
        category,
        amount,
        currency,
        code: (row?.code ?? "").toString().trim() || null,
        note: (row?.note ?? "").toString().trim() || null,
        errors,
      };
    });

    const valid = rows.filter((row) => row.errors.length === 0).length;
    return jsonResponse({ rows, summary: { total: rows.length, valid, invalid: rows.length - valid } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
