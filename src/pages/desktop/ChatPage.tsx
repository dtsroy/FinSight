import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useChatHistory, useChatStream, useClearChat, type StreamingChat } from "@/hooks/useChat";
import { useRisk } from "@/hooks/useRisk";
import { AlertOctagon, Bot, Eraser, MessageCircle, Send, User, ShieldAlert, ShieldCheck, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SUGGESTIONS = [
  "看完 X 光后，我组合最大的风险是什么？",
  "如果 2022 熊市重演，我最坏会怎样？",
  "我该不该把余额宝换成货币基金？",
  "帮我总结一份可以发给家人看的体检结论",
];

// “已接近底部”的滑动阈值（px）——用户上滑超过这个距离后，不再自动跟随逐字输出。
const STICK_BOTTOM_THRESHOLD = 120;

export default function ChatPage() {
  const history = useChatHistory();
  const { send, streaming, isPending } = useChatStream();
  const clear = useClearChat();
  const { state: riskState, evaluate: reEvaluateRisk } = useRisk();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < STICK_BOTTOM_THRESHOLD;
  }, []);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history.data, streaming?.answer, streaming?.question, isPending]);

  const messages = history.data ?? [];
  const showEmptyState = messages.length === 0 && !streaming && !history.isLoading;

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setInput("");
    try {
      // @ts-expect-error riskState has a different type but works for serialization
      await send(trimmed, riskState);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
    }
  }

  async function onClear() {
    try {
      await clear.mutateAsync();
      toast.success("对话历史已清空");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "清空失败");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DiagnosticHeader
        title="AI 财务医生问诊"
        eyebrow="AI FINANCIAL DOCTOR"
        description="医生会读你的账本、X 光穿透、压力测试结果后再回答，永不推荐具体买卖，末尾都会附风险提示。"
      />

      {riskState && (
        <div className={`mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4 rounded-lg border p-4 shadow-sm ${
          riskState.level === "critical" ? "border-destructive/30 bg-destructive/5" :
          riskState.level === "warning" ? "border-warning/30 bg-warning/5" :
          riskState.level === "normal" ? "border-success/30 bg-success/5" :
          "border-border bg-secondary/30"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 rounded-full p-1.5 ${
              riskState.level === "critical" ? "bg-destructive/20 text-destructive" :
              riskState.level === "warning" ? "bg-warning/20 text-warning" :
              riskState.level === "normal" ? "bg-success/20 text-success" :
              "bg-muted text-muted-foreground"
            }`}>
              {riskState.level === "critical" ? <ShieldAlert className="size-5" /> :
               riskState.level === "warning" ? <AlertTriangle className="size-5" /> :
               riskState.level === "normal" ? <ShieldCheck className="size-5" /> :
               <Shield className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold ${
                  riskState.level === "critical" ? "text-destructive" :
                  riskState.level === "warning" ? "text-warning" :
                  riskState.level === "normal" ? "text-success" :
                  "text-foreground"
                }`}>
                  {riskState.level === "critical" ? "高风险预警 (Critical)" :
                   riskState.level === "warning" ? "重点提醒 (Warning)" :
                   riskState.level === "normal" ? "健康 (Normal)" :
                   "信息不足 (Insufficient Info)"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  评估时间：{new Date(riskState.evaluatedAt).toLocaleString("zh-CN", { hour12: false })}
                </span>
              </div>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {riskState.reasons.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => { reEvaluateRisk(); toast.success("已重新评估风险等级"); }} className="shrink-0 gap-2">
            <RefreshCw className="size-3.5" /> 重新评估
          </Button>
        </div>
      )}

      <section className="flex flex-1 flex-col gap-6">
        <aside className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-sm font-medium">诊断师定位</h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>· 只指出集中度与风险，不推荐具体买卖</li>
              <li>· 每次回复末尾附风险提示</li>
              <li>· 触发严重风险时切换为犀利语气</li>
            </ul>
          </article>
          <article className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-medium">常见问题</h2>
            <div className="grid gap-2">
              {SUGGESTIONS.slice(0, 2).map((s) => (
                <button
                  key={s}
                  className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-left text-xs leading-5 text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => submit(s)}
                  disabled={isPending}
                >
                  {s}
                </button>
              ))}
            </div>
          </article>
          <article className="rounded-lg border border-info/30 bg-info/5 p-5 text-xs leading-5 text-muted-foreground flex flex-col justify-center">
            <b className="block text-foreground text-sm mb-2">还没数据？</b>
            <p className="mt-1">医生会引导你先去 <Link to="/xray" className="text-link underline">/xray</Link> 或 <Link to="/stress-test" className="text-link underline">/stress-test</Link> 生成体检快照。</p>
          </article>
        </aside>

        <div className="flex h-[600px] flex-col rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2 text-sm">
              <MessageCircle className="size-4 text-primary" />
              <span>私密对话 · 仅你自己可见</span>
            </div>
            {messages.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" disabled={isPending}>
                    <Eraser className="size-3.5" />清空历史
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>清空全部对话？</AlertDialogTitle>
                    <AlertDialogDescription>所有和 AI 医生的问诊记录会被永久删除，无法恢复。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={onClear}>确认清空</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 space-y-4 overflow-y-auto p-6">
            {history.isLoading ? (
              <>
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="ml-auto h-16 w-3/5" />
              </>
            ) : showEmptyState ? (
              <div className="grid place-items-center py-12 text-center">
                <Bot className="size-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">医生已准备好</p>
                <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">
                  提问示例："帮我看看我组合里最大的风险是什么？" 或者选择右边的常见问题开始。
                </p>
              </div>
            ) : (
              messages.map((m) => <ChatBubble key={m.id} role={m.role} content={m.content} tone={m.tone} />)
            )}
            {streaming && <StreamingBubbles streaming={streaming} />}
          </div>

          <form
            className="border-t border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`向 AI 医生描述你的担忧，或直接问："我最大的风险在哪里？"`}
              rows={2}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              className="mb-3 resize-none"
              disabled={isPending}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ctrl / ⌘ + Enter 发送 · {input.length}/2000</span>
              <Button type="submit" disabled={isPending || !input.trim()} className="gap-2">
                <Send className="size-3.5" /> 发送给医生
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function StreamingBubbles({ streaming }: { streaming: StreamingChat }) {
  return (
    <>
      <ChatBubble role="user" content={streaming.question} tone={null} />
      <ChatBubble
        role="assistant"
        content={streaming.answer}
        tone={streaming.tone}
        streaming={!streaming.finalized}
      />
    </>
  );
}

function ChatBubble({
  role,
  content,
  tone,
  streaming = false,
}: {
  role: string;
  content: string;
  tone: "friendly" | "sharp" | null;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  const isPlaceholder = !isUser && streaming && content.length === 0;
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`grid size-8 shrink-0 place-items-center rounded-full text-primary-foreground ${isUser ? "bg-primary" : "bg-info"}`}>
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${isUser ? "border-primary/25 bg-primary/10" : tone === "sharp" ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/40"}`}>
          {tone === "sharp" && !isUser && (
            <p className="mb-2 flex items-center gap-2 text-xs font-medium text-destructive">
              <AlertOctagon className="size-3.5" />医生已切换为犀利模式
            </p>
          )}
          {isPlaceholder ? (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              医生正在读取你的体检数据并思考
              <BlinkingDots />
            </span>
          ) : (
            <div className="whitespace-pre-wrap">
              {content}
              {streaming && content.length > 0 && <span className="ml-0.5 inline-block h-3 w-1 translate-y-0.5 animate-pulse rounded-sm bg-muted-foreground/60 align-baseline" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BlinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: "0ms" }} />
      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: "120ms" }} />
      <span className="size-1 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: "240ms" }} />
    </span>
  );
}
