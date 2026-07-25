import { corsHeaders, jsonResponse, requireUser } from "../_shared/auth.ts";
import { toBaseAmount } from "../_shared/currency.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const RISK_FOOTER = "\n\n—— 风险提示：本回答基于你提供的账本快照进行诊断，仅作为家庭财务体检参考，不构成具体买卖建议。市场有风险，投资需谨慎。";
const RATE_LIMIT_HOUR = 20;
const RATE_LIMIT_DAY = 100;
const STALE_MINUTES = 30; // 快照超过 30 分钟不用于犀利语气触发

const SSE_HEADERS = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no",
};

// 用于清洗模型自己写的"风险提示"段（后台会另附统一 footer）
const CLEAN_RISK_RE = /(?:—+|-+)?\s*风险提示[:：][\s\S]*$/g;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  const auth = await requireUser(req);
  if (auth instanceof Response) return auth;
  const { userId, jwt } = auth;

  const body = await req.json().catch(() => ({}));
  const message: string = typeof body?.message === "string" ? body.message.trim() : "";
  const riskState: any = body?.riskState ?? null;
  if (!message) return jsonResponse({ error: "empty_message" }, 400);
  if (message.length > 2000) return jsonResponse({ error: "too_long", limit: 2000 }, 413);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  // Rate limit：滚动 1 小时 / 24 小时（流开始前判断，命中直接普通 JSON 返回）
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [hourCountRes, dayCountRes] = await Promise.all([
    supabase.from("chat_messages").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("role", "user").gte("created_at", hourAgo),
    supabase.from("chat_messages").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("role", "user").gte("created_at", dayAgo),
  ]);
  if (hourCountRes.error || dayCountRes.error) {
    console.error("chat_rate_check_failed", hourCountRes.error, dayCountRes.error);
    return jsonResponse({ error: "rate_check_failed" }, 500);
  }
  const hourCount = hourCountRes.count ?? 0;
  const dayCount = dayCountRes.count ?? 0;
  if (hourCount >= RATE_LIMIT_HOUR) {
    return jsonResponse({
      error: "rate_limited",
      window: "hour",
      retry_after_seconds: 60 * 60,
      message: `每小时最多问诊 ${RATE_LIMIT_HOUR} 次，请稍后再来。`,
    }, 429);
  }
  if (dayCount >= RATE_LIMIT_DAY) {
    return jsonResponse({
      error: "rate_limited",
      window: "day",
      retry_after_seconds: 12 * 60 * 60,
      message: `每 24 小时最多问诊 ${RATE_LIMIT_DAY} 次，请稍后再来。`,
    }, 429);
  }

  const [assetsRes, xrayRes, stressRunIdRes, historyRes, profileRes] = await Promise.all([
    supabase.from("assets").select("name, category, platform, amount, currency, code")
      .eq("user_id", userId),
    supabase.from("xray_reports").select("id, created_at, top_stocks, duplicate_holdings, alerts")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("stress_test_runs").select("run_id, created_at")
      .eq("user_id", userId).not("run_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("chat_messages").select("role, content, seq")
      .eq("user_id", userId).order("seq", { ascending: false }).limit(10),
    supabase.from("user_profiles").select("monthly_expense").eq("user_id", userId).maybeSingle(),
  ]);
  if (assetsRes.error || xrayRes.error || stressRunIdRes.error || historyRes.error || profileRes.error) {
    console.error("chat_context_load_failed", assetsRes.error, xrayRes.error, stressRunIdRes.error, historyRes.error, profileRes.error);
    return jsonResponse({ error: "context_load_failed" }, 500);
  }

  const assets = (assetsRes.data ?? []) as { name: string; category: string; platform: string | null; amount: number; currency: string | null; code: string | null }[];
  if (assets.length === 0) {
    return jsonResponse({ error: "no_assets", message: "请先在账本里录入你的资产，再来找医生问诊。" }, 400);
  }

  // 拿最新一轮压力测试的完整 4 条
  let stressRuns: Record<string, unknown>[] = [];
  if (stressRunIdRes.data?.run_id) {
    const sr = await supabase.from("stress_test_runs")
      .select("scenario, scenario_label, estimated_loss, loss_pct, recovery_days, emergency_months, detail, created_at")
      .eq("user_id", userId).eq("run_id", stressRunIdRes.data.run_id);
    if (sr.error) {
      console.error("chat_stress_group_failed", sr.error);
      return jsonResponse({ error: "context_load_failed" }, 500);
    }
    stressRuns = sr.data ?? [];
  }

  // 人民币等值聚合下发给模型，避免多币种直相加导致估值错误。
  const total = assets.reduce((s, a) => s + toBaseAmount(a.amount, a.currency), 0);
  const summary = summarizeAssets(assets);
  const xray = xrayRes.data;
  const monthlyExpense = Number(profileRes.data?.monthly_expense ?? 15000);
  const history = (historyRes.data ?? []).slice().reverse() as { role: string; content: string }[];

  const staleThreshold = new Date(Date.now() - STALE_MINUTES * 60 * 1000);
  const xrayFresh = xray ? new Date(xray.created_at) >= staleThreshold : false;
  const stressFresh = stressRuns.length > 0 && new Date(String(stressRuns[0].created_at)) >= staleThreshold;

  const context = buildContext({ total, summary, xray, stressRuns, monthlyExpense, xrayFresh, stressFresh });

  const riskInfo = riskState ? `
【当前确定的风险评估状态】
- 等级：${riskState.level}
- 触发原因：${(riskState.reasons || []).join("；")}
（注：此状态由系统硬规则计算得出，你必须尊重此等级进行表达，不能自行推翻或决定等级。若为 critical 请使用犀利直接语气，否则使用温和语气。）
` : "";

  const systemPrompt = `你是「财务诊断医生」，专门为个人投资者体检散在多平台的资产组合。核心原则：
1. 诊断师定位：只指出风险与集中度、复盘历史情景冲击、解释底层持仓，不推荐任何具体买卖动作。
2. 直白语言：用大白话说"哪里有风险、最坏会怎样、缓冲能撑多久"，避免堆砌专业术语。
3. 语气模式：请根据下方给出的【当前确定的风险评估状态】调整语气。如果等级为 critical，必须切换为犀利直接语气，用"你必须先..."或"最紧要的是..."等句式引起重视；若为 warning 或 normal，请保持温和、共情。
4. 结构：先给一句结论，再列 2-4 条具体解释，最后引导用户下一步查看的页面（X 光穿透 / 压力测试 / 资产账本）。不要写 markdown 表格。
5. 一律不使用 emoji 与营销话术。
6. 如果某项体检快照已过期（下文标注），请提醒用户先重新扫描/测试再下结论，不要凭旧快照断言当前风险。
${riskInfo}
以下是本用户当前的资产诊断快照（真实数据，不要编造）：
${context}`;

  const messagesPayload = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const sharp = riskState?.level === "critical";
  const tone: "friendly" | "sharp" = sharp ? "sharp" : "friendly";

  let aiRes: Response;
  try {
    aiRes = await fetch("https://gateway.superun.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPERUN_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "superun-think-pro",
        messages: messagesPayload,
        temperature: sharp ? 0.55 : 0.7,
        max_tokens: 900,
        stream: true,
      }),
    });
  } catch (err) {
    console.error("chat_ai_fetch_failed", err);
    return jsonResponse({ error: "ai_failed" }, 502);
  }
  if (!aiRes.ok || !aiRes.body) {
    const errText = await aiRes.text().catch(() => "");
    console.error("chat_ai_upstream", aiRes.status, errText.slice(0, 300));
    return jsonResponse({ error: "ai_failed" }, 502);
  }

  const xrayId = xray?.id ?? null;
  const stressRunId = stressRunIdRes.data?.run_id ?? null;
  const reader = aiRes.body.getReader();

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      let accumulated = "";
      let emittedLen = 0;
      let closed = false;
      let aborted = false;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch (err) {
          console.error("chat_stream_enqueue_failed", err);
        }
      };
      const emit = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        safeEnqueue(encoder.encode(payload));
      };
      const closeQuietly = () => {
        if (closed) return;
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      };

      // 客户端断开：立即取消 upstream 读，跳过持久化，避免存下不完整的问答
      const abortSignal = req.signal;
      const onAbort = () => {
        aborted = true;
        closed = true;
        reader.cancel().catch(() => { /* upstream already ended */ });
      };
      abortSignal.addEventListener("abort", onAbort);

      emit("meta", { tone });

      let buffer = "";
      try {
        while (!aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || !line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (typeof delta === "string" && delta) {
                accumulated += delta;
                // 只 emit "肯定不会被清洗掉"的前缀；末尾疑似风险提示前缀先 hold，
                // 避免用户看到"—— 风险提示：..."闪一下再被替换。
                const emittable = safeEmittableLength(accumulated);
                if (emittable > emittedLen) {
                  emit("delta", { delta: accumulated.slice(emittedLen, emittable) });
                  emittedLen = emittable;
                }
              }
            } catch {
              // gateway 偶尔发心跳/空行，忽略
            }
          }
        }
      } catch (err) {
        console.error("chat_stream_failed", err);
        if (!aborted) {
          emit("error", { message: "问诊过程中断，请稍后重试。" });
        }
        closeQuietly();
        abortSignal.removeEventListener("abort", onAbort);
        return;
      }

      if (aborted) {
        // 客户端已断开：不写库、直接结束，避免污染 chat_messages 和后续 LLM 上下文
        closeQuietly();
        abortSignal.removeEventListener("abort", onAbort);
        return;
      }

      // 清洗模型自己写的风险提示，再统一附上后台控制的 footer
      const cleaned = accumulated.trim().replace(CLEAN_RISK_RE, "").trim();
      if (!cleaned) {
        console.error("chat_ai_empty_stream");
        emit("error", { message: "AI 医生暂时没有回复，请稍后再试。" });
        closeQuietly();
        abortSignal.removeEventListener("abort", onAbort);
        return;
      }
      const finalReply = cleaned + RISK_FOOTER;

      // 补发流末尾漏发的部分（正常路径 = cleaned.slice(emittedLen) + RISK_FOOTER）
      const safeEmittedLen = Math.min(emittedLen, cleaned.length);
      const tail = finalReply.slice(safeEmittedLen);
      if (tail) emit("delta", { delta: tail });

      // 双条 INSERT，助手失败则补偿删除用户消息，避免孤儿
      const userInsertRes = await supabase.from("chat_messages").insert({
        user_id: userId, role: "user", content: message,
      }).select("id").single();
      if (userInsertRes.error) {
        console.error("chat_user_insert_failed", userInsertRes.error);
        emit("error", { message: "AI 回复已生成，但保存失败，请稍后重试。" });
        closeQuietly();
        abortSignal.removeEventListener("abort", onAbort);
        return;
      }
      const userMessageId = userInsertRes.data.id;
      const assistantInsertRes = await supabase.from("chat_messages").insert({
        user_id: userId, role: "assistant", content: finalReply, tone,
        metadata: { xray_id: xrayId, stress_run_id: stressRunId },
      }).select("id").single();
      if (assistantInsertRes.error) {
        console.error("chat_assistant_insert_failed", assistantInsertRes.error);
        // 回滚刚插入的用户消息，避免"有问无答"的孤儿
        const rollback = await supabase.from("chat_messages").delete().eq("id", userMessageId);
        if (rollback.error) console.error("chat_user_insert_rollback_failed", rollback.error);
        emit("error", { message: "AI 回复已生成，但保存失败，请稍后重试。" });
        closeQuietly();
        abortSignal.removeEventListener("abort", onAbort);
        return;
      }

      emit("done", { reply: finalReply, tone });
      closeQuietly();
      abortSignal.removeEventListener("abort", onAbort);
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
});

/**
 * 计算 accumulated 里"可以安全 emit"的长度：尽量与下方 cleaning 逻辑对齐，
 * 确保 emittedLen 总 <= cleaned.length，使删入的 delta 拼接 = cleaned 前缀，
 * 无 flicker。
 */
function safeEmittableLength(text: string): number {
  // 情况 1：完整出现"风险提示："，包含前面可选的 dash + 空白。与 CLEAN_RISK_RE 对齐。
  const fullMatch = text.match(/(?:—+|-+)?\s*风险提示[:：]/);
  if (fullMatch && typeof fullMatch.index === "number") return fullMatch.index;
  // 情况 2：先剥掉末尾会被 .trim() 抹掉的空白
  let n = text.length;
  while (n > 0 && /\s/.test(text.charAt(n - 1))) n--;
  // 情况 3：末尾正在生成"—— 风险提示"前缀（尚未包含冒号，不会被情况 1 命中）
  const trailing = text.slice(0, n).match(/(?:—+|-+)\s*(?:风(?:险(?:提(?:示)?)?)?)?[:：]?$/);
  if (trailing && typeof trailing.index === "number" && trailing[0].length > 0) {
    return trailing.index;
  }
  return n;
}

function summarizeAssets(assets: { category: string; amount: number; currency: string | null; platform: string | null; name: string }[]) {
  const byCategory: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const a of assets) {
    const cny = toBaseAmount(a.amount, a.currency);
    byCategory[a.category] = (byCategory[a.category] ?? 0) + cny;
    const p = a.platform ?? "未标注";
    byPlatform[p] = (byPlatform[p] ?? 0) + cny;
  }
  return { byCategory, byPlatform, count: assets.length };
}

function buildContext(input: {
  total: number;
  summary: { byCategory: Record<string, number>; byPlatform: Record<string, number>; count: number };
  xray: Record<string, unknown> | null;
  stressRuns: Record<string, unknown>[];
  monthlyExpense: number;
  xrayFresh: boolean;
  stressFresh: boolean;
}): string {
  const { total, summary, xray, stressRuns, monthlyExpense, xrayFresh, stressFresh } = input;
  const lines: string[] = [];
  lines.push(`- 总资产：¥${fmt(total)}（${summary.count} 笔）`);
  lines.push(`- 类别分布：${Object.entries(summary.byCategory).map(([k, v]) => `${catLabel(k)} ¥${fmt(v)}`).join("，")}`);
  lines.push(`- 平台分布：${Object.entries(summary.byPlatform).slice(0, 5).map(([k, v]) => `${k} ¥${fmt(v)}`).join("，")}`);
  lines.push(`- 用户设定的月度硬性支出：¥${fmt(monthlyExpense)}`);

  if (xray) {
    const stale = xrayFresh ? "" : `（该 X 光快照生成于 ${new Date(String(xray.created_at)).toLocaleString("zh-CN")}，超过 ${STALE_MINUTES} 分钟未刷新，可能已不反映最新账本）`;
    lines.push(`- 最近一次 X 光穿透 ${stale}：`);
    const stocks = (xray.top_stocks as { stock_code?: string; pct: number }[] | undefined) ?? [];
    if (stocks.length > 0) {
      const top5 = stocks.slice(0, 5)
        .map((s) => `${displayStockCode(s.stock_code)} ${Number(s.pct).toFixed(1)}%`)
        .join("，");
      lines.push(`  · 穿透后 Top5 单票（股票代码）：${top5}。`);
      const first = stocks[0];
      if (first) lines.push(`  · 最重的一只占总资产 ${Number(first.pct).toFixed(1)}%。`);
    }
    const dupl = (xray.duplicate_holdings as unknown[] | undefined) ?? [];
    if (dupl.length > 0) lines.push(`  · ${dupl.length} 只个股被多只基金同时重仓（重复暴露）。`);
    const alerts = ((xray.alerts as { level: string; title: string }[] | undefined) ?? [])
      .filter((a) => !/行业/.test(a.title));
    if (alerts.length > 0) lines.push(`  · 触发告警：${alerts.map((a) => `[${a.level}] ${a.title}`).join("；")}。`);
  } else {
    lines.push(`- 用户尚未生成过 X 光穿透报告，可主动引导他去 /xray 页跑一次。`);
  }

  if (stressRuns.length > 0) {
    const stale = stressFresh ? "" : `（该压力测试快照生成于 ${new Date(String(stressRuns[0].created_at)).toLocaleString("zh-CN")}，超过 ${STALE_MINUTES} 分钟未刷新，可能已不反映最新账本）`;
    lines.push(`- 最近一轮压力测试 ${stale}：`);
    for (const r of stressRuns) {
      const loss = Number(r.estimated_loss);
      const pct = Number(r.loss_pct);
      const extra = r.emergency_months != null
        ? `应急金撑 ${Number(r.emergency_months).toFixed(1)} 个月`
        : r.recovery_days != null ? `预计恢复 ${r.recovery_days} 天` : "";
      lines.push(`  · ${r.scenario_label}：预计亏损 ¥${fmt(loss)}（${pct.toFixed(1)}%）${extra ? "，" + extra : ""}。`);
    }
  } else {
    lines.push(`- 用户尚未跑过压力测试，可主动引导他去 /stress-test 页测试。`);
  }
  return lines.join("\n");
}

function fmt(n: number): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(n);
}

function catLabel(cat: string): string {
  const map: Record<string, string> = {
    bank_deposit: "存款", stock: "股票", fund: "基金", bond: "债券",
    insurance: "保险", cash_management: "现金理财", other: "其他",
  };
  return map[cat] ?? cat;
}

/**
 * 无代码个股内部占位为 `__nocode_<uuid>`，不能把 UUID 直接送给模型（也不能送给用户），
 * 统一脱敏为“未标注个股”；无代码、空字符串同样处理。
 */
function displayStockCode(code: string | undefined | null): string {
  const s = String(code ?? "").trim();
  if (!s || s.startsWith("__nocode_")) return "未标注个股";
  return s;
}
