import AlertRow from "@/components/desktop/AlertRow";
import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import MonthlyExpenseDialog from "@/components/desktop/MonthlyExpenseDialog";
import QuoteChangeBadge from "@/components/desktop/QuoteChangeBadge";
import ShareReportPanel from "@/components/desktop/ShareReportPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetsByCategory, useAssetsByPlatform, useAssetSummary, useQuotableAssets } from "@/hooks/useAssetLedger";
import { usePortfolioQuoteChange, toQuoteRequests } from "@/hooks/useQuotes";
import { useProfile } from "@/hooks/useProfile";
import { useLatestStressRuns } from "@/hooks/useStress";
import { useLatestXRay } from "@/hooks/useXray";
import { formatCompact, formatCurrency } from "@/lib/asset-format";
import { CATEGORY_LABEL, CATEGORY_TONE, type AssetCategory, type CategorySummary } from "@/types/app/asset";
import { Activity, ArrowRight, CircleDollarSign, PlusCircle, ShieldAlert, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const summary = useAssetSummary();
  const byCategory = useAssetsByCategory();
  const byPlatform = useAssetsByPlatform();
  const xray = useLatestXRay();
  const stress = useLatestStressRuns();
  const profile = useProfile();

  const total = summary.data?.total ?? 0;
  const assetsCount = summary.data?.count ?? 0;

  // 全量「有行情」资产 → 组合级今日涨跌（CNY），展示在总资产卡片上。
  const quotableAssets = useQuotableAssets();
  const portfolioQuoteRequests = useMemo(() => toQuoteRequests(quotableAssets.data ?? []), [quotableAssets.data]);
  const portfolioChange = usePortfolioQuoteChange(portfolioQuoteRequests);
  const cashLike = useMemo(
    () => (byCategory.data ?? [])
      .filter((r) => r.category === "bank_deposit" || r.category === "cash_management")
      .reduce((s, r) => s + r.amount, 0),
    [byCategory.data],
  );
  const monthlyExpense = profile.data?.monthly_expense ?? 15000;
  const emergencyMonths = monthlyExpense > 0 ? cashLike / monthlyExpense : 0;
  const isEmpty = !summary.isLoading && assetsCount === 0;
  const alerts = xray.data?.alerts ?? [];
  const stressRuns = stress.data ?? [];
  const jobLoss = stressRuns.find((r) => r.scenario === "job_loss");
  const worstMarket = stressRuns.filter((r) => r.scenario !== "job_loss").sort((a, b) => b.loss_pct - a.loss_pct)[0];

  const healthScore = useMemo(() => {
    // 现金缓冲 (40) + X 光穿透集中度 (40) + 应急金月份 (20)
    let s = 40;
    if (total > 0) s += Math.min(40, (cashLike / total) * 100);
    if (xray.data) {
      const conc = Number(xray.data.concentration_score);
      s -= Math.max(0, (conc - 40) * 0.6);
    }
    s += Math.min(20, emergencyMonths * 3);
    return Math.max(30, Math.min(99, Math.round(s)));
  }, [total, cashLike, xray.data, emergencyMonths]);

  if (isEmpty) return <EmptyDashboard />;

  return (
    <div>
      <DiagnosticHeader
        title="资产全景"
        eyebrow="PORTFOLIO PANORAMA"
        description={summary.isLoading ? "载入你的账本…" : `你的 ${assetsCount} 项资产已归集完成，先看总账再深入诊断。`}
      />

      <section className="mb-6 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs tracking-[.25em] text-muted-foreground">组合生命体征</p>
            <div className="mt-2 flex items-baseline gap-2">
              <b className="font-mono text-4xl text-primary">{summary.isLoading ? "…" : healthScore}</b>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              综合现金缓冲、集中度、应急金覆盖三项计算。
            </p>
          </div>
          <div className="pulse-line h-12 flex-1" />
          <div className="flex flex-col items-end gap-2">
            <p className="flex items-center gap-2 text-xs text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />账本实时同步中
            </p>
            <MonthlyExpenseDialog />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="总资产"
          value={summary.isLoading ? null : formatCurrency(total)}
          note={`${assetsCount} 项资产 · ${byCategory.data?.length ?? 0} 个类别${summary.data?.converted ? " · 含外币（折算）" : ""}`}
          icon={<CircleDollarSign className="size-4 text-primary" />}
          change={portfolioChange.data.covered > 0 ? (
            <QuoteChangeBadge
              variant="block"
              detailed={false}
              currency="CNY"
              loading={portfolioChange.isLoading}
              change={{
                code: "portfolio",
                changeAmount: portfolioChange.data.changeAmount,
                changePct: portfolioChange.data.changePct,
                currency: "CNY",
                asOf: new Date().toISOString(),
              }}
            />
          ) : null}
        />
        <MetricCard
          label="现金 + 存款"
          value={summary.isLoading ? null : formatCurrency(cashLike)}
          note={total > 0 ? `占总资产 ${((cashLike / total) * 100).toFixed(1)}%` : ""}
          icon={<WalletCards className="size-4 text-info" />}
        />
        <MetricCard
          label="应急金覆盖"
          value={profile.isLoading ? null : `${emergencyMonths.toFixed(1)} 个月`}
          note={`每月硬性支出 ${formatCurrency(monthlyExpense)}`}
          icon={<Activity className="size-4 text-chart-2" />}
          highlight={emergencyMonths < 3}
        />
        <MetricCard
          label="X 光集中度"
          value={xray.data ? `${Number(xray.data.concentration_score).toFixed(1)}%` : "尚未扫描"}
          note={xray.data?.top_industry ? `最高行业：${xray.data.top_industry}` : "去 /xray 一键穿透"}
          icon={<ShieldAlert className="size-4 text-warning" />}
          highlight={Number(xray.data?.concentration_score ?? 0) > 60}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">资产类别分布</h2>
            <span className="font-mono text-xs text-muted-foreground">CNY</span>
          </div>
          <div className="mt-6 space-y-5">
            {byCategory.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
              : (byCategory.data ?? []).map((row) => (
                <CategoryBar key={row.category} row={row} total={total} />
              ))}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">按平台分布</h2>
            <span className="font-mono text-xs text-muted-foreground">{byPlatform.data?.length ?? 0} 个渠道</span>
          </div>
          <div className="mt-6 space-y-4">
            {byPlatform.isLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)
              : (byPlatform.data ?? []).slice(0, 8).map((row) => (
                <PlatformBar key={row.platform} platform={row.platform} amount={row.amount} count={row.count} total={total} />
              ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert className="size-5" /><h2 className="font-medium">关键风险预警</h2>
          </div>
          <div className="mt-4 space-y-3">
            {xray.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : xray.data == null ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                <p>还没有生成过 X 光穿透报告。</p>
                <Button asChild className="mt-4 gap-2"><Link to="/xray">立即扫描 <ArrowRight className="size-4" /></Link></Button>
              </div>
            ) : alerts.length === 0 ? (
              <div className="rounded-md border border-success/30 bg-success/10 p-4 text-sm">
                <b>暂未发现明显风险。</b>
                <p className="mt-1 text-muted-foreground">最新 X 光穿透没有触发任何单行业或单票集中度告警。</p>
              </div>
            ) : (
              alerts.map((a, i) => <AlertRow key={i} alert={a} />)
            )}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary">
            <Activity className="size-5" /><h2 className="font-medium">今日诊断摘要</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6">
            {xray.data && (
              <p className="text-muted-foreground">
                最近一次 X 光穿透显示，前三大行业合计权重 <b className="text-foreground">{Number(xray.data.concentration_score).toFixed(1)}%</b>
                {xray.data.top_industry ? <>，最高行业 <b className="text-foreground">{xray.data.top_industry}</b>（{Number(xray.data.top_industry_pct ?? 0).toFixed(1)}%）。</> : "。"}
              </p>
            )}
            {worstMarket && (
              <p className="text-muted-foreground">
                在 <b className="text-foreground">{worstMarket.scenario_label}</b> 情景下，组合预估亏损 <b className="text-destructive">{formatCurrency(worstMarket.estimated_loss)}</b>（{worstMarket.loss_pct.toFixed(1)}%）。
              </p>
            )}
            {jobLoss && (
              <p className="text-muted-foreground">
                失业模拟：应急金可覆盖 <b className="text-foreground">{Number(jobLoss.emergency_months ?? 0).toFixed(1)}</b> 个月，之后需动用投资资产折价变现。
              </p>
            )}
            {!xray.data && !worstMarket && (
              <p className="text-muted-foreground">
                资产账本已就绪。跑一次 X 光和压力测试，就能看到属于你的诊断摘要。
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="gap-2"><Link to="/xray">基金 X 光穿透 <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="secondary" className="gap-2"><Link to="/stress-test">压力测试 <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="ghost" className="gap-2"><Link to="/chat">找 AI 医生聊聊</Link></Button>
            <ShareReportPanel compact />
          </div>
        </article>
      </section>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-dashed border-primary/25 bg-primary/5 p-4 text-sm">
        <Activity className="size-4 text-primary" />
        <p className="text-muted-foreground">在其他标签页或设备上做的账本改动会即时反映到这里。</p>
        <Button asChild variant="ghost" size="sm" className="ml-auto gap-2"><Link to="/import"><PlusCircle className="size-4" />继续添加资产</Link></Button>
      </section>
    </div>
  );
}

function CategoryBar({ row, total }: { row: CategorySummary; total: number }) {
  const pct = total > 0 ? (row.amount / total) * 100 : 0;
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-muted-foreground">
          {CATEGORY_LABEL[row.category]}
          <span className="ml-2 text-xs text-muted-foreground/70">{row.count} 项 · {pct.toFixed(1)}%</span>
        </span>
        <span className="font-mono">{formatCurrency(row.amount)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary">
        <div className={`h-full rounded-full ${CATEGORY_TONE[row.category as AssetCategory]}`} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

function PlatformBar({ platform, amount, count, total }: { platform: string; amount: number; count: number; total: number }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-foreground">{platform} <span className="text-xs text-muted-foreground">· {count} 项</span></span>
        <span className="font-mono text-muted-foreground">{formatCurrency(amount)} · {pct.toFixed(1)}%</span>
      </div>
      <div className="h-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(pct, 2)}%` }} /></div>
    </div>
  );
}

function MetricCard({ label, value, note, icon, highlight, change }: { label: string; value: string | null; note?: string; icon?: React.ReactNode; highlight?: boolean; change?: React.ReactNode }) {
  return (
    <section className={`rounded-lg border p-5 shadow-sm ${highlight ? "border-warning/40 bg-warning/10" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">{label}{icon}</div>
      {value == null ? <Skeleton className="mt-4 h-8 w-40" /> : <strong className="mt-4 block font-mono text-3xl tracking-tight text-primary md:text-4xl">{value}</strong>}
      {change && <div className="mt-2">{change}</div>}
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </section>
  );
}

function EmptyDashboard() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><CircleDollarSign className="size-7" /></div>
        <h2 className="mt-5 text-xl font-bold">账本还是空的</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">先把散落在各平台的资产放到账本里，就能看到属于你的诊断报告。</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild className="gap-2"><Link to="/import"><PlusCircle className="size-4" />开始添加资产</Link></Button>
          <Button asChild variant="ghost"><Link to="/import">或载入演示用户小王</Link></Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">当前总额：<span className="font-mono">{formatCompact(0)}</span></p>
      </div>
    </div>
  );
}
