import AccountDialog from "@/components/desktop/AccountDialog";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { signOutAndReanonymize } from "@/services/authService";
import { Activity, ArrowRight, FileScan, FlaskConical, Layers3, LogIn, LogOut, ShieldCheck, Target, TrendingUp, Sun, Moon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";

const features = [
  { icon: Layers3, title: "多维极速导入与智能归类", text: "零样本视觉特征提取，自动判断机构特征并归集各类资产。" },
  { icon: FileScan, title: "底层资产穿透 X-Ray", text: "击碎“假分散”。穿透基金底稿，找出重叠持仓与隐形的高危暴露。" },
  { icon: FlaskConical, title: "自适应问诊引擎", text: "告别生硬问卷。在温和投顾与严厉医生间无缝切换，阻断情绪化决策。" },
];

const titleWords = ["分散", "安全", "稳健", "掌控"];
const subWords = ["API 协同归集资产", "穿透剖析底层持仓", "宏观视角的压力测试", "极度理性的风控阻断"];
const highlightColors = [
  "from-warning/30 to-warning/20",
  "from-info/30 to-info/20",
  "from-success/30 to-success/20"
];

const mockPieData = [
  { name: "贵州茅台", value: 18.5 },
  { name: "其他资产", value: 81.5 },
];
const COLORS = ["hsl(var(--foreground))", "hsl(var(--muted))"];

export default function LandingPage() {
  const identity = useAccountIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signin" | "signup">("signin");
  const [signingOut, setSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
  return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => prev + 1);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
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

  function formatEmail(email: string | null) {
    if (!email) return "";
    const parts = email.split("@");
    const name = parts[0];
    if (name.length <= 4) return name;
    return `${name.slice(0, 2)}***${name.slice(-2)}`;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* 顶栏 (滚动时浮现边界与毛玻璃) */}
      <nav className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? "border-b border-border/40 bg-background/80 backdrop-blur-lg" : "bg-transparent"}`}>
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-5 md:px-10">
          <span className="flex items-center gap-3 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-foreground text-background"><Activity className="size-4" /></span>
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
                已登录 · <span className="font-mono">{formatEmail(identity.email)}</span>
              </span>
              <Link to="/dashboard" className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm">
                进入账本 <ArrowRight className="size-3.5" />
              </Link>
              <button onClick={onSignOut} disabled={signingOut} className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-destructive">
                <LogOut className="size-4" />{signingOut ? "退出中…" : "退出"}
              </button>
            </>
          )}
          
          <div className="ml-2 hidden h-5 w-px bg-border md:block"></div>
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            className="flex items-center justify-center rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
        </div>
      </nav>

      {/* 极简网格背景 */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <main className="mx-auto max-w-[1200px] px-5 pb-24 pt-32 md:px-10 md:pt-40">
        
        {/* Top Centered Section */}
        <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <p className="mb-6 font-mono text-xs font-semibold tracking-[.32em] text-foreground/60">YOUR NEXT-GEN INSIGHT HUB</p>
          <h1 className="text-6xl font-extrabold leading-[1.1] tracking-tighter md:text-[5.5rem]">
            你以为的
            <span className="relative mx-4 inline-flex items-center justify-center">
              <span className={`absolute -inset-x-3 -inset-y-1 -skew-y-2 bg-gradient-to-r ${highlightColors[activeIndex % highlightColors.length]} transition-colors duration-500`}></span>
              <span className="relative text-foreground transition-all duration-500">{titleWords[activeIndex % titleWords.length]}</span>
            </span>
            ，<br />
            可能只是棋局的表象。
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-muted-foreground md:text-xl text-center">
            将机构级视野赋能给普通的 Pawn。<br />
            通过
            <span className="relative mx-3 inline-flex items-center justify-center">
              <span className={`absolute -inset-x-3 -inset-y-1 -skew-y-2 bg-gradient-to-r ${highlightColors[(activeIndex + 1) % highlightColors.length]} transition-colors duration-500`}></span>
              <span className="relative text-foreground transition-all duration-500">{subWords[activeIndex % subWords.length]}</span>
            </span>
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/dashboard" className="group flex items-center gap-2 rounded-xl bg-foreground px-8 py-4 text-base font-semibold text-background transition-all hover:bg-foreground/90 hover:shadow-xl hover:shadow-foreground/20">
              {identity.isAnonymous ? "免费开始使用" : "打开我的账本"} 
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {identity.isAnonymous ? (
              <button onClick={() => openDialog("signup")} className="rounded-xl border border-border bg-card px-8 py-4 text-base font-semibold transition-all hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm">
                注册保存我的资产
              </button>
            ) : (
              <Link to="/xray" className="rounded-xl border border-border bg-card px-8 py-4 text-base font-semibold transition-all hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm">
                先看 X 光报告
              </Link>
            )}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs font-medium text-muted-foreground/80">
            <ShieldCheck className="size-4" />
            {identity.isAnonymous
              ? "游客模式仅在本设备保留数据；注册邮箱账户后可跨设备访问。"
              : "你的账本、诊断和对话全部按账号隔离，任何人（含开发者）都无权访问。"}
          </p>
        </section>

        {/* Bottom Split Section */}
        <section className="mt-32 grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
          
          {/* Left: 3D Alarm Panel */}
          <div className="group [perspective:1000px] relative">
            <div 
              ref={cardRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="radiograph-panel relative rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-2xl transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-[0_20px_60px_-15px_rgba(239,68,68,0.15)] md:p-8"
              style={{
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
              }}
            >
              <div className="scanner-line" />
              <div className="flex items-center justify-between border-b border-border/50 pb-5">
                <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground/80">AGENT: X-RAY ENGINE</span>
                <span className="relative flex items-center gap-2 rounded-full border border-foreground/20 bg-foreground/5 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-[0_0_15px_rgba(0,0,0,0.05)]">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-40"></span>
                    <span className="relative inline-flex size-2 rounded-full bg-foreground"></span>
                  </span>
                  诊断分析中
                </span>
              </div>
              
              {/* Pie Chart Section */}
              <div className="relative mt-8 flex flex-col items-center justify-center">
                <div className="relative h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={mockPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                        animationDuration={1500}
                      >
                        {mockPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} opacity={index === 0 ? 1 : 0.2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-3xl font-bold tracking-tighter text-foreground">18.5 %</span>
                    <span className="text-[10px] font-medium text-muted-foreground">贵州茅台</span>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-muted-foreground">单票隐性重仓过载</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">表面直接持有仅 8%，穿透后触发风控阈值</p>
                </div>
              </div>

              {/* Bottom Metrics */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="group/metric flex flex-col items-start justify-between rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:bg-background/80">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">高危行业集中度</span>
                    <Target className="size-4 text-muted-foreground/50 transition-colors group-hover/metric:text-foreground" />
                  </div>
                  <b className="mt-3 block font-mono text-2xl tracking-tight text-foreground">60 <span className="text-lg text-muted-foreground">%+</span></b>
                </div>
                <div className="group/metric flex flex-col items-start justify-between rounded-xl border border-border/50 bg-background/40 p-4 transition-colors hover:bg-background/80">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">流动性储备</span>
                    <TrendingUp className="size-4 text-muted-foreground/50 transition-colors group-hover/metric:text-foreground" />
                  </div>
                  <b className="mt-3 block font-mono text-2xl tracking-tight text-foreground">&lt; 3 <span className="text-sm text-muted-foreground">个月</span></b>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Vertical Features Stack */}
          <div className="flex flex-col gap-5">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="group/feature flex items-start gap-5 rounded-2xl border border-border/60 bg-card/40 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:bg-card hover:shadow-xl hover:shadow-foreground/5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 text-foreground transition-all duration-300 group-hover/feature:scale-110 group-hover/feature:bg-foreground group-hover/feature:text-background">
                  <Icon className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <p className="mt-20 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <ShieldCheck className="size-4" />资产诊断分析不构成投资建议，投资有风险，决策需谨慎。
        </p>
      </main>
      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} isAnonymous={identity.isAnonymous} defaultMode={dialogMode} />
    </div>
  );
}
