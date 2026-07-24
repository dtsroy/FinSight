import AlertRow from "@/components/desktop/AlertRow";
import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import ShareReportPanel from "@/components/desktop/ShareReportPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestXRay, useRunXRay } from "@/hooks/useXray";
import { formatCurrency } from "@/lib/asset-format";
import type { XRayReport } from "@/types/app/analytics";
import { ArrowRight, FileScan, Loader2, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export default function XRayPage() {
  const latest = useLatestXRay();
  const run = useRunXRay();

  async function onRun() {
    try {
      await run.mutateAsync();
      toast.success("X 光穿透已完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "扫描失败";
      toast.error(msg);
    }
  }

  return (
    <div>
      <DiagnosticHeader
        title="基金 X 光穿透"
        eyebrow="FUND X-RAY LOOK-THROUGH"
        description="把你的每一只基金拆平到底层持仓，加上直接持股，算出真实行业与个股集中度。"
      />

      <section className="mb-6 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs tracking-[.25em] text-muted-foreground">扫描控制台</p>
            <h2 className="mt-1 font-medium">{latest.data ? `最近一次扫描：${new Date(latest.data.created_at).toLocaleString("zh-CN")}` : "尚未生成过 X 光穿透报告"}</h2>
          </div>
          <div className="flex items-center gap-2">
            {latest.data && <ShareReportPanel compact />}
            <Button onClick={onRun} disabled={run.isPending} className="gap-2">
              {run.isPending ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {latest.data ? "重新扫描" : "开始扫描"}
            </Button>
          </div>
        </div>
      </section>

      {run.isPending && (
        <div className="radiograph-panel relative mb-6 overflow-hidden rounded-lg border border-border bg-card p-8">
          <div className="scanner-line" />
          <div className="relative z-20 flex flex-col items-center gap-4 py-8 text-center">
            <FileScan className="size-8 text-primary" />
            <b>正在拆平基金底层与直接持股…</b>
            <p className="text-xs text-muted-foreground">拉取每只基金前 10 大重仓，加权到你的实际暴露上。</p>
          </div>
        </div>
      )}

      {latest.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : latest.data == null ? (
        <EmptyState onScan={onRun} pending={run.isPending} />
      ) : (
        <XRayReportView report={latest.data} />
      )}
    </div>
  );
}

function EmptyState({ onScan, pending }: { onScan: () => void; pending: boolean }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <FileScan className="size-10 text-muted-foreground/60" />
      <h3 className="mt-4 text-lg font-medium">还没扫描过</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        我们会以你账本里的基金持仓为输入，拉取每只基金前 10 大重仓，把权重摊到你身上，再叠加直接持股，得到穿透后的真实敞口。
        对于我们数据库暂未收录的基金，会单独列出并提示"未穿透"，不会静默丢弃。
      </p>
      <Button onClick={onScan} disabled={pending} className="mt-6 gap-2"><ScanLine className="size-4" />立即扫描</Button>
    </div>
  );
}

function XRayReportView({ report }: { report: XRayReport }) {
  const topIndustries = report.industry_exposure.slice(0, 8);
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="总资产" value={formatCurrency(report.total_amount)} note={`扫描时刻的账本快照`} />
        <StatCard label="基金 + 股票" value={formatCurrency(report.fund_amount + report.stock_amount)} note={`占比 ${(((report.fund_amount + report.stock_amount) / (report.total_amount || 1)) * 100).toFixed(1)}%`} />
        <StatCard label="集中度评分" value={`${report.concentration_score.toFixed(1)}%`} note="前三行业权重合计" tone={report.concentration_score > 60 ? "warn" : report.concentration_score > 45 ? "info" : "success"} />
        <StatCard label="最高单行业" value={report.top_industry ?? "-"} note={report.top_industry_pct != null ? fmtPct(report.top_industry_pct) : ""} tone={(report.top_industry_pct ?? 0) > 40 ? "danger" : "info"} />
      </section>

      {report.alerts.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 font-medium">发现的风险</h2>
          <div className="grid gap-3">
            {report.alerts.map((a, i) => <AlertRow key={i} alert={a} />)}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 font-medium">穿透后行业暴露</h2>
          <div className="space-y-4">
            {topIndustries.map((row) => (
              <div key={row.industry}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{row.industry}</span>
                  <span className="font-mono text-muted-foreground">{formatCurrency(row.amount)} · {fmtPct(row.pct)}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary">
                  <div
                    className={`h-full rounded-full ${row.pct > 30 ? "bg-destructive" : row.pct > 15 ? "bg-warning" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, Math.max(row.pct, 2))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 font-medium">Top 10 穿透后个股</h2>
          <ol className="space-y-3 text-sm">
            {report.top_stocks.slice(0, 10).map((s, i) => (
              <li key={s.stock_code} className="rounded-md border border-border bg-secondary/30 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <b className="text-foreground">{i + 1}. {s.stock_name}</b>
                    <span className="ml-2 text-xs text-muted-foreground">{s.stock_code} · {s.industry}</span>
                  </div>
                  <span className={`font-mono ${s.pct > 12 ? "text-destructive" : s.pct > 6 ? "text-warning" : "text-foreground"}`}>{fmtPct(s.pct)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  来源：{s.sources.map((x) => x.direct ? "直接持股" : x.fund_name).filter(Boolean).slice(0, 3).join("；")}
                  {s.sources.length > 3 && ` 等 ${s.sources.length} 处`}
                </p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      {report.duplicate_holdings.length > 0 && (
        <section className="rounded-lg border border-warning/30 bg-warning/5 p-5">
          <h2 className="mb-2 font-medium">跨基金重仓预警</h2>
          <p className="text-xs text-muted-foreground">同一支股票被 2+ 只基金同时持有意味着"表面上你分散买了多只基金，实际上仍集中在同几只股票上"。</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {report.duplicate_holdings.slice(0, 6).map((d) => (
              <div key={d.stock_code} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <b>{d.stock_name}</b>
                  <span className="font-mono text-warning">合计 {fmtPct(d.total_pct)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">出现在：{d.funds.map((f) => f.fund_name).join("、")}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {report.unmatched_funds.length > 0 && (
        <section className="rounded-lg border border-info/30 bg-info/5 p-4 text-sm">
          <b>以下基金仅部分穿透或未穿透，已将其未披露仓位计入“未知底层”以避免低估集中度：</b>
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {report.unmatched_funds.map((u, i) => (
              <li key={`${u.code ?? "nocode"}-${i}"`}>{u.name}{u.code ? `（${u.code}）` : "（无代码）"} · {formatCurrency(u.amount)}{u.reason ? `· ${u.reason}` : ""}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" className="gap-2"><Link to="/stress-test">下一步：跑压力测试 <ArrowRight className="size-4" /></Link></Button>
        <Button asChild variant="ghost" className="gap-2"><Link to="/chat">让 AI 医生解读这份报告 <ArrowRight className="size-4" /></Link></Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "danger" | "warn" | "info" | "success" }) {
  const toneMap = {
    danger: "border-destructive/40 bg-destructive/5 text-destructive",
    warn: "border-warning/40 bg-warning/10",
    info: "border-info/40 bg-info/5",
    success: "border-success/30 bg-success/5",
  } as const;
  return (
    <div className={`rounded-lg border p-5 shadow-sm ${tone ? toneMap[tone] : "border-border bg-card"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <b className="mt-3 block font-mono text-2xl tracking-tight">{value}</b>
      {note && <p className="mt-2 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
