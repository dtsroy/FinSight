import AccountDialog from "@/components/desktop/AccountDialog";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { signOutAndReanonymize } from "@/services/authService";
import { Activity, ArrowRight, FileScan, FlaskConical, Layers3, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const features = [
  { icon: Layers3, title: "多维极速导入与智能归类", text: "零样本视觉特征提取，自动判断机构特征并归集存款、基金、股票等各类资产。" },
  { icon: FileScan, title: "底层资产穿透 X-Ray", text: "击碎“假分散”。穿透基金底稿，找出重叠持仓与隐形的高危行业暴露。" },
  { icon: FlaskConical, title: "自适应问诊引擎", text: "告别生硬问卷。在温和投顾与严厉医生间无缝切换，前置阻断你的情绪化危险决策。" },
];

export default function LandingPage() {
  const identity = useAccountIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signin" | "signup">("signin");
  const [signingOut, setSigningOut] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 计算旋转角度 (最大偏转 10 度)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = -((y - centerY) / centerY) * 10;
    const rotateY = ((x - centerX) / centerX) * 10;
    
    setRotation({ x: rotateX, y: rotateY });
  }

  function handleMouseLeave() {
    setRotation({ x: 0, y: 0 });
  }

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
        <span className="flex items-center gap-3 font-bold">
          <span className="grid size-9 place-items-center rounded-lg border border-primary/30 bg-primary/10 text-primary"><Activity className="size-5" /></span>
          FinSight
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
      <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-12 md:px-10 md:pt-24">
        <section className="grid items-center gap-16 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-5 font-mono text-xs tracking-[.32em] text-primary">YOUR NEXT-GEN INSIGHT HUB</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">
              你以为的分散，<br /><span className="text-primary">可能只是棋局的表象。</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">
              将机构级视野赋能给普通的 Pawn。通过 API 协同归集资产、穿透底层持仓，并在关键时刻触发极度理性的决策阻断。
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
          <div className="group perspective-1000 relative">
            <div 
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="radiograph-panel relative rounded-xl border border-border/50 bg-card/80 p-5 backdrop-blur-xl transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[20px_20px_40px_-10px_rgba(249,115,22,0.15)] md:p-7"
              style={{
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
              }}
            >
              <div className="scanner-line" />
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <span className="font-mono text-xs font-semibold text-muted-foreground tracking-widest">X-RAY · ENGINE ACTIVE</span>
              <span className="relative flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-destructive"></span>
                </span>
                Critical 级告警
              </span>
            </div>
            <div className="py-9 text-center">
              <p className="text-sm text-muted-foreground">贵州茅台 · 重复暴露计算</p>
              <strong className="mt-3 block font-mono text-7xl text-destructive">18%</strong>
              <p className="mt-3 text-sm text-muted-foreground">表面直接持有仅 8%</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/50 bg-background/40 p-4 transition-colors group-hover:bg-background/60">
                <p className="text-xs font-medium text-muted-foreground">高危行业集中度</p>
                <b className="mt-2 block font-mono text-3xl tracking-tight text-chart-4">60%+</b>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-4 transition-colors group-hover:bg-background/60">
                <p className="text-xs font-medium text-muted-foreground">应急资金储备</p>
                <b className="mt-2 block font-mono text-3xl tracking-tight text-destructive">&lt; 3 个月</b>
              </div>
            </div>
          </div>
        </div>
        </section>
        <section className="mt-24 grid gap-6 md:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
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
