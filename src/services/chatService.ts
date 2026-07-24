import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/authService";
import type { ChatMessage } from "@/types/app/analytics";

function toMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: String(row.id),
    role: (row.role as ChatMessage["role"]) ?? "assistant",
    content: String(row.content),
    tone: (row.tone as ChatMessage["tone"]) ?? null,
    metadata: (row.metadata as ChatMessage["metadata"]) ?? null,
    created_at: String(row.created_at),
  };
}

export async function listChatMessages(limit = 40): Promise<ChatMessage[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", userId)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return [...((data ?? []) as Record<string, unknown>[])].reverse().map(toMessage);
}

export interface ChatStreamHandlers {
  onMeta?: (tone: "friendly" | "sharp") => void;
  onDelta?: (delta: string) => void;
  onDone?: (result: { reply: string; tone: "friendly" | "sharp" }) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

/**
 * 直连 Edge Function 拉 SSE 流。supabase.functions.invoke 会等 body 全部完成，
 * 拿不到逐字增量，所以这里手动 fetch。
 */
export async function streamChatMessage(
  message: string,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  const accessToken = sessionRes?.session?.access_token;
  if (!accessToken) throw new Error("登录状态已失效，请重新登录后再问诊。");

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/ai-doctor-chat`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
      "apikey": SUPABASE_ANON_KEY,
      "Accept": "text/event-stream",
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let parsed: { message?: string; error?: string } | null = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    const detail = parsed?.message ?? parsed?.error ?? `HTTP ${response.status}`;
    throw new Error(mapErrorMessage(detail));
  }
  if (!response.body) throw new Error("AI 医生返回了空响应，请稍后重试。");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneEmitted = false;
  let streamedError: string | null = null;

  const flushEvents = (chunk: string) => {
    buffer += chunk;
    // SSE 事件以两个换行分隔
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";
    for (const raw of parts) {
      if (!raw.trim()) continue;
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
      }
      if (dataLines.length === 0) continue;
      const dataStr = dataLines.join("\n");
      let payload: Record<string, unknown> | null = null;
      try { payload = JSON.parse(dataStr); } catch { continue; }
      if (!payload) continue;
      switch (eventName) {
        case "meta": {
          const tone = payload.tone === "sharp" ? "sharp" : "friendly";
          handlers.onMeta?.(tone);
          break;
        }
        case "delta": {
          if (typeof payload.delta === "string" && payload.delta.length > 0) {
            handlers.onDelta?.(payload.delta);
          }
          break;
        }
        case "done": {
          const reply = typeof payload.reply === "string" ? payload.reply : "";
          const tone = payload.tone === "sharp" ? "sharp" : "friendly";
          handlers.onDone?.({ reply, tone });
          doneEmitted = true;
          break;
        }
        case "error": {
          streamedError = typeof payload.message === "string" && payload.message
            ? payload.message
            : "问诊过程中断，请稍后重试。";
          break;
        }
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    flushEvents(decoder.decode(value, { stream: true }));
    if (streamedError) break;
  }
  if (buffer.trim().length > 0) flushEvents("\n\n");

  if (streamedError) throw new Error(streamedError);
  if (!doneEmitted) throw new Error("AI 医生连接中断，请稍后重试。");
}

function mapErrorMessage(detail: string): string {
  if (/rate_limited/i.test(detail)) return "问诊次数已达当前上限，请稍后再来。";
  if (/no_assets/i.test(detail)) return "请先在账本里录入你的资产，再来找医生问诊。";
  if (/too_long/i.test(detail)) return "问题太长了，请精简到 2000 字以内。";
  if (/context_load_failed/i.test(detail)) return "读取你的体检数据时出错，请稍后重试。";
  if (/ai_failed|ai_empty/i.test(detail)) return "AI 医生暂时无法回复，请稍后重试。";
  return detail;
}

export async function clearChatHistory(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  const { error } = await supabase.from("chat_messages").delete().eq("user_id", userId);
  if (error) throw error;
}
