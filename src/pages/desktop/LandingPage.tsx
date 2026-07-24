import AccountDialog from "@/components/desktop/AccountDialog";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { signOutAndReanonymize } from "@/services/authService";
import { Activity, ArrowRight, FileScan, FlaskConical, Layers3, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const features = [
  { icon: Layers3, title: "全资产归集", text: "把银行、基金、股票、保险放进同一张资产底片。" },
  { icon: FileScan, title: "基金穿透", text: "拆开基金外壳，看见真正的行业与个股集中度。" },
  { icon: FlaskConical, title: "极端压力测试", text: "模拟股灾、失业与急用钱，提前知道组合能扛多久。" },
];

export default function LandingPage() {
  const identity = useAccountIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signin" | "signup">("signin");
  const [signingOut, setSigningOut] = useState(false);

  function openDialog(mode: "signin" | "signup") {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  async function onSignOut() {
    setSigningOut(true);
    try {
      await signOutAndReanonymize();
      toast.success("已退出，切回游客模式");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "退出登录失败");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 md:px-10">
        <span className="flex items-center gap-3 font-bold tracking-[.18em]">
          <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Activity className="size-5" /></span>
          财务 X 光
        </span>
        <div className="flex items-center gap-2 md:gap-4">
          {identity.isAnonymous ? (
            <>
              <button onClick={() => openDialog("signin")} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-primary">
                <LogIn className="size-4" />登录
              </button>
              <button onClick={() => openDialog("signup")} className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/15">
                注册
              </button>
            </>
          ) : (
            <>
              <span className="hidden text-xs text-muted-foreground md:inline">
                已登录 · <span className="font-mono">{identity.email}</span>
              </span>
              <Link to="/dashboard" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm">
                进入账本 <ArrowRight className="size-3.5" />
              </Link>
              <button onClick={onSignOut} disabled={signingOut} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-destructive">
                <LogOut className="size-4" />{signingOut ? "退出中…" : "退出"}
              </button>
            </>
          )}
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] px-5 pb-20 pt-12 md:px-10 md:pt-24">
        <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-5 font-mono text-xs tracking-[.32em] text-primary">AI 全资产透视管家</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">
              你以为的分散，<br /><span className="text-primary">可能只是表象。</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
              一页归集所有资产，穿透基金底层持仓，再用极端场景检验你的财务韧性。只诊断风险，不替你做投资决定。
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/dashboard" className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">
                {identity.isAnonymous ? "作为游客试用" : "打开我的账本"} <ArrowRight className="size-4" />
              </Link>
              {identity.isAnonymous ? (
                <button onClick={() => openDialog("signup")} className="rounded-md border border-border bg-card px-6 py-3 text-sm">
                  注册保存我的资产
                </button>
              ) : (
                <Link to="/xray" className="rounded-md border border-border bg-card px-6 py-3 text-sm">先看 X 光报告</Link>
              )}
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              {identity.isAnonymous
                ? "游客模式仅在本设备保留数据；注册邮箱账户后可跨设备访问同一份账本。"
                : "你的账本、诊断和对话全部按账号隔离，任何人（含开发者）都读不到你的私人明细。"}
            </p>
          </div>
          <div className="radiograph-panel relative rounded-lg border border-border bg-card p-5 md:p-7">
            <div className="scanner-line" />
            <div className="flex items-center justify-between border-b border-border pb-4">
              <span className="font-mono text-xs text-muted-foreground">SCAN · CN-8942</span>
              <span className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-xs text-destructive">检出高集中风险</span>
            </div>
            <div className="py-9 text-center">
              <p className="text-sm text-muted-foreground">贵州茅台 · 穿透后真实暴露</p>
              <strong className="mt-3 block font-mono text-7xl text-destructive">18%</strong>
              <p className="mt-3 text-sm text-muted-foreground">表面直接持有仅 8%</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">消费 + 医疗</p>
                <b className="mt-2 block font-mono text-2xl text-chart-4">60%+</b>
              </div>
              <div className="rounded border border-border bg-background/50 p-4">
                <p className="text-xs text-muted-foreground">应急资金</p>
                <b className="mt-2 block font-mono text-2xl text-destructive">5个月</b>
              </div>
            </div>
          </div>
        </section>
        <section className="mt-24 grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-lg border border-border bg-card p-6">
              <Icon className="size-6 text-primary" />
              <h2 className="mt-6 font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{text}</p>
            </article>
          ))}
        </section>
        <p className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />资产诊断分析不构成投资建议，投资有风险，决策需谨慎。
        </p>
      </main>
      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} isAnonymous={identity.isAnonymous} defaultMode={dialogMode} />
    </div>
  );
}
