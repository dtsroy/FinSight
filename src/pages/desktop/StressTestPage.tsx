import DiagnosticHeader from "@/components/desktop/DiagnosticHeader";
import MonthlyExpenseDialog from "@/components/desktop/MonthlyExpenseDialog";
import ShareReportPanel from "@/components/desktop/ShareReportPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useLatestStressRuns, useRunStressTest } from "@/hooks/useStress";
import { formatCurrency } from "@/lib/asset-format";
import type { StressTestRun } from "@/types/app/analytics";
import { ArrowRight, FlaskConical, Loader2, TrendingDown, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SCENARIO_META: Record<string, { badge: string; note: string }> = {
  crash_2015: { badge: "2015 股灾", note: "急速下跌 · 中小成长股跌幅最重" },
  pandemic_2020: { badge: "2020 疫情熔断", note: "海外冲击 · 消费出行下杀" },
  bear_2022: { badge: "2022 熊市", note: "新能源与消费板块显著回调" },
  job_loss: { badge: "失业 + 急用钱", note: "假设失业 6 个月 + 一次性支出 5 万" },
};

export default function StressTestPage() {
  const runs = useLatestStressRuns();
  const runner = useRunStressTest();
  const profile = useProfile();

  async function onRunAll() {
    try {
      await runner.mutateAsync(undefined);
      toast.success("压力测试已完成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "测试失败");
    }
  }

  return (
    <div>
      <DiagnosticHeader
        title="极端情景压力测试"
        eyebrow="STRESS TEST LAB"
        description="把你的组合套入历史股灾/疫情/熊市，以及失业 + 急用钱情景，看看最坏会怎样。"
      />

      <section className="mb-6 flex flex-col gap-3 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="size-6 text-primary" />
          <div>
            <p className="text-sm">当前月度硬性支出：<b className="font-mono">{formatCurrency(profile.data?.monthly_expense ?? 15000)}</b></p>
            <p className="text-xs text-muted-foreground">压力测试的"失业+急用钱"情景基于该数值计算应急金覆盖月份。</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MonthlyExpenseDialog />
          {runs.data && runs.data.length > 0 && <ShareReportPanel compact />}
          <Button onClick={onRunAll} disabled={runner.isPending} className="gap-2">
            {runner.isPending ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
            {runs.data && runs.data.length > 0 ? "重新跑一遍" : "开始测试"}
          </Button>
        </div>
      </section>

      {runs.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 w-full" />)}
        </div>
      ) : !runs.data || runs.data.length === 0 ? (
        <EmptyStress pending={runner.isPending} onRun={onRunAll} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {runs.data.map((r) => <StressCard key={r.id} run={r} />)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="gap-2"><Link to="/xray">回到 X 光穿透 <ArrowRight className="size-4" /></Link></Button>
            <Button asChild variant="ghost" className="gap-2"><Link to="/chat">让 AI 医生分析这些数字 <ArrowRight className="size-4" /></Link></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyStress({ onRun, pending }: { onRun: () => void; pending: boolean }) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <FlaskConical className="size-10 text-muted-foreground/60" />
      <h3 className="mt-4 text-lg font-medium">还没跑过压力测试</h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        我们准备了 2015 股灾、2020 疫情、2022 熊市三个市场情景，加上一个"失业+急用钱"生活情景。点击开始测试后，
        每个情景都会用穿透后的行业敞口和你设定的月度硬性支出跑一次，输出预估亏损、恢复期或应急金覆盖月份。
      </p>
      <Button onClick={onRun} disabled={pending} className="mt-6 gap-2"><FlaskConical className="size-4" />立即测试</Button>
    </div>
  );
}

function StressCard({ run }: { run: StressTestRun }) {
  const meta = SCENARIO_META[run.scenario] ?? { badge: run.scenario_label, note: "" };
  const isJobLoss = run.scenario === "job_loss";
  const breakdown = (run.detail.breakdown ?? []).slice(0, 5);
  const severe = run.loss_pct > 25 || (run.emergency_months != null && run.emergency_months < 3);

  return (
    <article className={`rounded-lg border p-5 ${severe ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.2em] text-muted-foreground">{meta.badge}</p>
          <h3 className="mt-1 text-lg font-medium">{run.scenario_label}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{meta.note || run.detail.desc}</p>
        </div>
        <TrendingDown className={`size-5 ${severe ? "text-destructive" : "text-muted-foreground"}`} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">预估亏损</p>
          <b className={`mt-1 block font-mono text-2xl ${severe ? "text-destructive" : "text-foreground"}`}>
            {formatCurrency(run.estimated_loss)}
          </b>
          <p className="text-xs text-muted-foreground">占组合 {run.loss_pct.toFixed(1)}%</p>
        </div>
        {isJobLoss ? (
          <div>
            <p className="text-xs text-muted-foreground">应急金覆盖</p>
            <b className={`mt-1 block font-mono text-2xl ${(run.emergency_months ?? 0) < 3 ? "text-destructive" : "text-foreground"}`}>
              {(run.emergency_months ?? 0).toFixed(1)} 个月
            </b>
            <p className="text-xs text-muted-foreground">硬性支出 {formatCurrency(run.detail.monthly_expense ?? 15000)}/月</p>
          </div>
        ) : (
          <div>
            <p className="text-xs text-muted-foreground">恢复期估计</p>
            <b className="mt-1 block font-mono text-2xl">{run.recovery_days ?? 0} 天</b>
            <p className="text-xs text-muted-foreground">按历史行情复原周期给出的估算值</p>
          </div>
        )}
      </div>

      {run.detail.summary && (
        <p className="mt-4 rounded-md border border-border bg-secondary/40 p-3 text-sm leading-6">{run.detail.summary}</p>
      )}

      {breakdown.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">影响拆解</p>
          <ul className="space-y-1.5 text-sm">
            {breakdown.map((b) => (
              <li key={b.key} className="flex items-center justify-between">
                <span>{b.label}</span>
                <span className="font-mono text-destructive">-{formatCurrency(b.loss)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
