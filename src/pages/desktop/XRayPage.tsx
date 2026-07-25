import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import ShareReportPanel from "@/components/desktop/ShareReportPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useStockNames } from "@/hooks/useStockNames";
import { useLatestXRay, useRunXRay } from "@/hooks/useXray";
import { formatCurrency } from "@/lib/asset-format";
import type { XRayReport } from "@/types/app/analytics";
import { FileScan, Loader2, ScanLine } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

/** 重仓预警的收敛策略：合计占比 ≥ 1% 才算"明显"，最多展示 5 条。 */
const DUPLICATE_ALERT_MIN_PCT = 1;
const DUPLICATE_ALERT_MAX_COUNT = 5;

function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** 无代码个股占位符 `__nocode_<id>` → 展示为 "—"，避免把内部 id 泄漏给用户。 */
function displayCode(code: string): string {
  return code.startsWith("__nocode_") ? "—" : code;
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
        description="把你的每一只基金拆平到底层持仓，加上直接持股，看清穿透后的真实个股暴露。"
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
      </p>
      <Button onClick={onScan} disabled={pending} className="mt-6 gap-2"><ScanLine className="size-4" />立即扫描</Button>
    </div>
  );
}

function XRayReportView({ report }: { report: XRayReport }) {
  const top10 = report.top_stocks.slice(0, 10);

  // 未穿透金额：包含“无代码 / 底稿未收录 / 披露不足”三种情形。
  // Top10 的 pct 分母是总资产，只反映已披露部分——在卡片头部直接展示未披露量，避免“假分散”错觉。
  const unmatchedTotal = useMemo(
    () => report.unmatched_funds.reduce((sum, u) => sum + Number(u.amount || 0), 0),
    [report.unmatched_funds],
  );
  const unmatchedPct = report.total_amount > 0 ? (unmatchedTotal / report.total_amount) * 100 : 0;

  // 挑最明显的重仓预警：先按合计占比 desc，再过滤门槛 + 截断上限。
  const duplicateAlerts = useMemo(() => {
    return [...report.duplicate_holdings]
      .sort((a, b) => b.total_pct - a.total_pct)
      .filter((d) => d.total_pct >= DUPLICATE_ALERT_MIN_PCT)
      .slice(0, DUPLICATE_ALERT_MAX_COUNT);
  }, [report.duplicate_holdings]);

  // Top10 与重仓预警展示要拿名称的股票代码合起来去查一次。
  const codesForNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of top10) if (!s.stock_code.startsWith("__nocode_")) set.add(s.stock_code);
    for (const d of duplicateAlerts) if (!d.stock_code.startsWith("__nocode_")) set.add(d.stock_code);
    return Array.from(set);
  }, [top10, duplicateAlerts]);
  const names = useStockNames(codesForNames);
  const nameMap = names.data ?? {};

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <article className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 font-medium">Top 10 穿透后个股</h2>
        {unmatchedTotal > 0 && (
          <p className="mb-4 rounded-md border border-dashed border-warning/40 bg-warning/5 p-3 text-xs leading-5 text-muted-foreground">
            另有 <b className="font-mono text-foreground">{formatCurrency(unmatchedTotal)}</b>（约占总资产 <b className="font-mono text-foreground">{unmatchedPct.toFixed(1)}%</b>）的基金仓位未被穿透，下方占比仅代表已披露部分。
          </p>
        )}
        {top10.length === 0 ? (
          <p className="text-sm text-muted-foreground">尚无穿透后的个股（可能你的账本里没有基金 / 股票）。</p>
        ) : (
          <ol className="space-y-3 text-sm">
            {top10.map((s, i) => {
              const code = displayCode(s.stock_code);
              const displayName = nameMap[s.stock_code];
              return (
                <li key={s.stock_code} className="rounded-md border border-border bg-secondary/30 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="font-mono text-foreground">{i + 1}. {code}</b>
                      {displayName && (
                        <span className="ml-2 text-xs text-muted-foreground">{displayName}</span>
                      )}
                    </div>
                    <span className={`shrink-0 font-mono ${s.pct > 12 ? "text-destructive" : s.pct > 6 ? "text-warning" : "text-foreground"}`}>{fmtPct(s.pct)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    来源：{s.sources.map((x) => x.direct ? "直接持股" : x.fund_name).filter(Boolean).slice(0, 3).join("；")}
                    {s.sources.length > 3 && ` 等 ${s.sources.length} 处`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </article>

      <article className="rounded-lg border border-warning/30 bg-warning/5 p-5">
        <h2 className="mb-1 font-medium">跨基金重仓预警</h2>
        <p className="text-xs text-muted-foreground">同一支股票被 2+ 只基金同时持有意味着"表面上你分散买了多只基金，实际上仍集中在同几只股票上"。这里只挑最明显的几只。</p>
        {duplicateAlerts.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            没有被 2 只及以上基金同时重仓的个股。
          </div>
        ) : (
          <ul className="mt-4 space-y-3 text-sm">
            {duplicateAlerts.map((d) => {
              const code = displayCode(d.stock_code);
              const displayName = nameMap[d.stock_code];
              return (
                <li key={d.stock_code} className="rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <b className="font-mono">{code}</b>
                      {displayName && (
                        <span className="ml-2 text-xs text-muted-foreground">{displayName}</span>
                      )}
                    </div>
                    <span className="shrink-0 font-mono text-warning">合计 {fmtPct(d.total_pct)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    出现在：{d.funds.map((f) => f.fund_name).slice(0, 3).join("、")}
                    {d.funds.length > 3 && ` 等 ${d.funds.length} 只`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </article>
    </div>
  );
}
