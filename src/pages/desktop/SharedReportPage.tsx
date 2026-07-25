import SiteLogo from "@/components/SiteLogo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicReport } from "@/services/reportService";
import type { SharedReportSnapshot } from "@/types/app/analytics";
import { useQuery } from "@tanstack/react-query";
import * as htmlToImage from "html-to-image";
import { ArrowRight, Download, Home, ShieldAlert, TimerReset } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

const CATEGORY_LABEL: Record<string, string> = {
  bank_deposit: "银行存款",
  stock: "股票",
  fund: "基金",
  bond: "债券",
  insurance: "保险",
  cash_management: "现金理财",
  other: "其他",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export default function SharedReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const q = useQuery({
    queryKey: ["shared_report", slug],
    queryFn: () => fetchPublicReport(slug ?? ""),
    enabled: !!slug,
    retry: false,
  });

  async function download() {
    const node = canvasRef.current;
    if (!node) return;
    setDownloading(true);
    try {
      const dataUrl = await htmlToImage.toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#fdfaf5",
      });
      const link = document.createElement("a");
      link.download = `${q.data?.title ?? "financial-xray-report"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("已保存为长图");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导出失败");
    } finally {
      setDownloading(false);
    }
  }

  if (q.isLoading) {
    return <div className="mx-auto max-w-3xl p-6"><Skeleton className="h-96 w-full" /></div>;
  }
  if (q.isError || !q.data) {
    const msg = q.error instanceof Error ? q.error.message : "报告不可用";
    const status = /expired|revoked/i.test(msg) ? "已失效" : "找不到该报告";
    return (
      <div className="mx-auto grid min-h-screen max-w-lg place-items-center p-6 text-center">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8">
          <TimerReset className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-lg font-medium">{status}</h1>
          <p className="mt-2 text-sm text-muted-foreground">该分享链接可能已被撤销、已过期，或从未存在。请联系分享者重新生成。</p>
          <Button asChild variant="secondary" className="mt-6 gap-2"><Link to="/"><Home className="size-4" />回到首页</Link></Button>
        </div>
      </div>
    );
  }

  const snapshot = q.data.snapshot as SharedReportSnapshot;

  return (
    <div className="min-h-screen py-6">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6">
        <Link to="/" className="text-sm text-primary hover:underline">
          <SiteLogo iconClassName="size-4" label="财务 X 光" textClassName="" className="gap-2" />
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>有效期至 {formatDate(q.data.expires_at)}</span>
          <Button size="sm" variant="secondary" onClick={download} disabled={downloading} className="gap-2">
            <Download className="size-3.5" />{downloading ? "生成中…" : "保存为图片"}
          </Button>
        </div>
      </div>

      <article ref={canvasRef} className="mx-auto mt-4 max-w-4xl rounded-2xl bg-card p-8 shadow-2xl md:p-10">
        <header className="border-b border-border pb-6">
          <p className="font-mono text-xs tracking-[.3em] text-primary">FINANCIAL X-RAY · QUARTERLY REPORT</p>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">{snapshot.title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">生成于 {formatDate(snapshot.generated_at)}</p>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-3">
          <Stat label="总资产" value={formatCurrency(snapshot.portfolio.total)} />
          <Stat label="资产项数" value={`${snapshot.portfolio.count} 项`} />
          <Stat
            label="Top1 单票占比"
            value={snapshot.xray && snapshot.xray.top_stocks.length > 0 ? `${Number(snapshot.xray.top_stocks[0].pct).toFixed(1)}%` : "—"}
            tone={snapshot.xray && snapshot.xray.top_stocks.length > 0 && Number(snapshot.xray.top_stocks[0].pct) > 15 ? "danger" : "info"}
          />
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-medium">类别分布</h2>
          <div className="space-y-3">
            {Object.entries(snapshot.portfolio.byCategory).sort(([, a], [, b]) => (b as number) - (a as number)).map(([cat, amount]) => {
              const pct = snapshot.portfolio.total > 0 ? ((amount as number) / snapshot.portfolio.total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm">
                    <span>{CATEGORY_LABEL[cat] ?? cat}</span>
                    <span className="font-mono text-muted-foreground">{formatCurrency(amount as number)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {(() => {
          if (!snapshot.xray) return null;
          // 兼容旧分享快照：行业告警已在产品维度删除；旧告警里可能残留 __nocode_<uuid>。
          const NOCODE = /__nocode_[a-f0-9-]+/g;
          const shownAlerts = snapshot.xray.alerts
            .filter((a) => !/行业/.test(a.title) && !/行业/.test(a.message))
            .map((a) => ({
              level: a.level,
              title: a.title.replace(NOCODE, "未标注个股"),
              message: a.message.replace(NOCODE, "未标注个股"),
            }));
          if (shownAlerts.length === 0) return null;
          return (
            <section className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium"><ShieldAlert className="size-4 text-destructive" />关键风险</h2>
              <ul className="space-y-2 text-sm">
                {shownAlerts.map((a, i) => (
                  <li key={i} className="rounded-md border border-border bg-secondary/40 p-3">
                    <b>{a.title}</b>
                    <p className="mt-1 text-muted-foreground">{a.message}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        {snapshot.xray && snapshot.xray.top_stocks.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium">穿透后 Top 单票</h2>
            <ol className="space-y-1.5 text-sm">
              {snapshot.xray.top_stocks.slice(0, 8).map((s, i) => {
                // 兼容：旧 snapshot 只有 stock_name/industry（无 stock_code），
                // 先优先用 stock_code，拿不到时回退到旧的 stock_name，都没就用 “—”。
                const legacy = s as { stock_name?: string };
                const label = s.stock_code || legacy.stock_name || "—";
                return (
                  <li key={i} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5">
                    <span className="font-mono">{i + 1}. {label}</span>
                    <span className="font-mono">{Number(s.pct).toFixed(1)}%</span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {snapshot.stress_tests && snapshot.stress_tests.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-medium">压力测试结论</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {snapshot.stress_tests.map((r) => (
                <div key={r.scenario} className="rounded-md border border-border bg-secondary/40 p-3">
                  <b className="text-sm">{r.scenario_label}</b>
                  <p className="mt-1 text-xs text-muted-foreground">
                    预估亏损 <span className="font-mono text-destructive">{formatCurrency(r.estimated_loss)}</span>（{r.loss_pct.toFixed(1)}%）
                    {r.emergency_months != null ? ` · 应急金撑 ${r.emergency_months.toFixed(1)} 个月` : r.recovery_days != null ? ` · 恢复约 ${r.recovery_days} 天` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
          <p>本报告为只读快照，不含具体交易账号。资产名称已做脱敏处理。</p>
          <p className="mt-1">仅供家庭财务体检参考，不构成任何投资建议。市场有风险，投资需谨慎。</p>
        </footer>
      </article>

      <div className="mx-auto mt-6 max-w-4xl px-6 text-xs text-muted-foreground">
        想为自己也生成一份？前往
        <Button asChild size="sm" variant="ghost" className="mx-1 h-6 gap-1 px-2 text-xs">
          <Link to="/">财务 X 光首页 <ArrowRight className="size-3" /></Link>
        </Button>
        免费体验。
      </div>
    </div>
  );
}

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "danger" | "info" }) {
  const toneCls = tone === "danger" ? "border-destructive/40 bg-destructive/5" : tone === "info" ? "border-info/40 bg-info/5" : "border-border bg-secondary/40";
  return (
    <div className={`rounded-md border p-3 ${toneCls}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <b className="mt-1 block font-mono text-xl tracking-tight">{value}</b>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
