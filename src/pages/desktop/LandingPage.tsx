import AccountDialog from "@/components/desktop/AccountDialog";
import FeatureCards from "@/components/desktop/landing/FeatureCards";
import LandingSectionHeader from "@/components/desktop/landing/LandingSectionHeader";
import LogoMarquee, { type LogoMarqueeItem } from "@/components/desktop/landing/LogoMarquee";
import XRayScannerPanel from "@/components/desktop/landing/XRayScannerPanel";
import IndustryDistributionBar, { type IndustryBarItem } from "@/components/desktop/xray/IndustryDistributionBar";
import StockShareDonut, { type StockShareItem } from "@/components/desktop/xray/StockShareDonut";
import SiteLogo from "@/components/SiteLogo";
import { useAccountIdentity } from "@/hooks/useAuthGuard";
import { signOutAndReanonymize } from "@/services/authService";
import { ArrowRight, LogIn, LogOut, ShieldCheck, Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const titleWords = ["分散", "安全", "稳健", "掌控"];
const subWords = ["API 协同归集资产", "穿透剖析底层持仓", "宏观视角的压力测试", "极度理性的风控阻断"];
const highlightColors = [
  "from-warning/30 to-warning/20",
  "from-info/30 to-info/20",
  "from-success/30 to-success/20"
];

/** 使用的服务 —— svg 到位前先渲染空位占位，后续把 `src` 填上即可无痛替换 */
const SERVICES: LogoMarqueeItem[] = [
  { label: "Superun AI Gateway", note: "视觉 + 推理大模型" },
  { label: "Superun Cloud", note: "Postgres · Auth · Edge" },
  { label: "Panda AI Quant", note: "A 股行情 · 名称 · 行业" },
  { label: "同花顺 10jqka", note: "基金披露前 10 重仓" },
  { label: "FastAPI + Uvicorn", note: "行情桥接后端" },
  { label: "cpolar", note: "HTTPS 内网穿透" },
  { label: "React 18 + Vite", note: "前端框架" },
  { label: "Tailwind CSS", note: "样式引擎" },
  { label: "shadcn/ui", note: "组件底座" },
  { label: "Recharts", note: "数据可视化" },
];

/** 支持一键 OCR 识别的银行 / 机构 —— svg 到位前先渲染空位占位 */
const OCR_BRANDS: LogoMarqueeItem[] = [
  { label: "招商银行" },
  { label: "建设银行" },
  { label: "中国工商银行" },
  { label: "中国银行" },
  { label: "农业银行" },
  { label: "交通银行" },
  { label: "中信银行" },
  { label: "兴业银行" },
  { label: "浦发银行" },
  { label: "平安银行" },
  { label: "汇丰银行" },
  { label: "渣打银行" },
  { label: "支付宝 · 蚂蚁财富" },
  { label: "微信" },
  { label: "天天基金" },
  { label: "同花顺" },
];

/**
 * Landing 页两张雷达卡的静态演示数据。数值取自演示组合"小王"真实 X 光穿透输出，
 * 视觉与登录后 /xray 页完全一致 —— Landing 页游客无需触发后端就能看到"真实感"。
 */
const XRAY_DONUT_MOCK: StockShareItem[] = [
  { key: "600519", label: "贵州茅台（600519）", amount: 48869, pct: 9.72 },
  { key: "300750", label: "宁德时代（300750）", amount: 38015, pct: 7.56 },
  { key: "000568", label: "泸州老窖（000568）", amount: 5836, pct: 1.16 },
  { key: "600809", label: "山西汾酒（600809）", amount: 5017, pct: 1.0 },
  { key: "000858", label: "五粮液（000858）", amount: 4784, pct: 0.95 },
  { key: "002384", label: "东山精密（002384）", amount: 4326, pct: 0.86 },
  { key: "603986", label: "兆易创新（603986）", amount: 3488, pct: 0.69 },
  { key: "300502", label: "新易盛（300502）", amount: 3375, pct: 0.67 },
  { key: "__others__", label: "其他 12 只个股", amount: 34100, pct: 6.78, aggregate: true },
  { key: "__unmatched__", label: "未穿透基金仓位", amount: 96056, pct: 19.10, aggregate: true },
];

const XRAY_INDUSTRY_MOCK: IndustryBarItem[] = [
  { key: "必需消费品", label: "必需消费品", amount: 64586, pct: 12.85, kind: "top" },
  { key: "工业", label: "工业", amount: 38015, pct: 7.56, kind: "top" },
  { key: "信息技术", label: "信息技术", amount: 29630, pct: 5.90, kind: "top" },
  { key: "医疗保健", label: "医疗保健", amount: 19614, pct: 3.90, kind: "top" },
  { key: "__other__", label: "其他行业", amount: 4966, pct: 0.99, kind: "other" },
  { key: "__unclassified__", label: "未识别行业", amount: 5045, pct: 1.00, kind: "unknown" },
  { key: "__unmatched__", label: "未穿透基金", amount: 96056, pct: 19.10, kind: "unmatched" },
];

export default function LandingPage() {
  const identity = useAccountIdentity();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"signin" | "signup">("signin");
  const [signingOut, setSigningOut] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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
          <SiteLogo iconClassName="size-8" />
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

        {/* ── Section 1 · Hero ─────────────────────────────────────────────── */}
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
            将机构级视野赋能给普通的 Pawn<br />
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

        {/* ── Section 2 · 双雷达面板：左环形（个股占比）+ 右柱状（行业分布）── */}
        <section className="mt-28 grid items-stretch gap-6 lg:grid-cols-2">
          <XRayScannerPanel
            title="AGENT · X-RAY DONUT"
            subtitle="穿透后个股相对占比"
            footerNote="Top 8 个股按占比由深到浅铺前景色；其余合并成「其他 12 只」；未穿透基金仓位单独归灰。"
          >
            <StockShareDonut items={XRAY_DONUT_MOCK} />
          </XRayScannerPanel>

          <XRayScannerPanel
            title="AGENT · SECTOR BAR"
            subtitle="完整行业分布 · 100% 全资产画像"
            footerNote="Top 5 行业 + 其他行业 + 未识别行业 + 未穿透基金一起拼齐，看清真实的行业集中度。"
          >
            <IndustryDistributionBar items={XRAY_INDUSTRY_MOCK} />
          </XRayScannerPanel>
        </section>

        {/* ── Section 3 · 六件武器 3×2 feature 卡片 ──────────────────────── */}
        <section className="mt-28">
          <LandingSectionHeader
            eyebrow="CAPABILITIES"
            title="FinSight 的六件武器"
            desc="从截图导入到 AI 诊断，六个动作，把你的资产从散落各处的孤岛拉回同一张桌面。"
          />
          <FeatureCards />
        </section>

        {/* ── Section 4 · 使用的服务（从右向左滑）───────────────────────── */}
        <section className="mt-24">
          <LandingSectionHeader
            eyebrow="STACK"
            title="我们的技术栈"
            desc="从数据采集到模型推理，每一段路都交给最擅长的服务。图标待你回来补上，占位卡随后无缝替换。"
          />
          <LogoMarquee items={SERVICES} direction="left" />
        </section>

        {/* ── Section 5 · 支持 OCR 的银行 / 机构（从左向右滑）──────────── */}
        <section className="mt-10">
          <LandingSectionHeader
            eyebrow="COMPATIBILITY"
            title="一键识别 · 支持的银行与机构"
            desc="主流商业银行、支付工具、公募基金 App，把账单截图丢进去，机构与代码一起被认出来。"
          />
          <LogoMarquee items={OCR_BRANDS} direction="right" />
        </section>

        <p className="mt-24 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <ShieldCheck className="size-4" />资产诊断分析不构成投资建议，投资有风险，决策需谨慎。
        </p>
      </main>
      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} isAnonymous={identity.isAnonymous} defaultMode={dialogMode} />
    </div>
  );
}
