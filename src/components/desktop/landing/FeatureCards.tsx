import {
  Camera,
  FlaskConical,
  Landmark,
  ScanLine,
  Stethoscope,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

interface FeatureItem {
  icon: LucideIcon;
  title: string;
  text: string;
  /** eyebrow tag — 用于分区（IMPORT / MARKET / DIAGNOSE），扫读时能定位到自己关心的能力 */
  tag: string;
}

/** 6 张 3×2 feature 卡的内容契约：跟 README「核心架构」三大板块对齐，海报也直接可用 */
const FEATURES: FeatureItem[] = [
  {
    tag: "INGEST",
    icon: Camera,
    title: "视觉极速导入",
    text: "多平台账单截图 OCR，自动提取金额、判定机构、抓取基金 / 股票代码，一次识别一整批。",
  },
  {
    tag: "INGEST",
    icon: Landmark,
    title: "平台品牌自动识别",
    text: "12 家银行 + 支付宝 / 微信 / 天天基金 / 同花顺 …… 常见机构自动配 logo，未匹配的原样保留文字。",
  },
  {
    tag: "MARKET",
    icon: TrendingUp,
    title: "双引擎实时行情",
    text: "Panda AI Quant 拉 A 股日 K、名称与行业，同花顺拉基金日涨跌与前 10 大重仓，双通道并发。",
  },
  {
    tag: "DIAGNOSE",
    icon: ScanLine,
    title: "底层资产 X 光穿透",
    text: "把基金披露到底层个股，与直接持股一起摊平，找出跨基金重复暴露的「假分散」重仓票。",
  },
  {
    tag: "DIAGNOSE",
    icon: FlaskConical,
    title: "极端情景压力测试",
    text: "2015 股灾 / 2020 疫情 / 2022 熊市 / 家庭失业四大情景，按资产大类模拟你会怎样受伤。",
  },
  {
    tag: "DIAGNOSE",
    icon: Stethoscope,
    title: "AI 财务医生对话",
    text: "温和教练 / 严厉医生自适应人格切换，触发风控自动亮红字，只诊断问题、不推荐买卖。",
  },
];

export default function FeatureCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map(({ icon: Icon, title, text, tag }) => (
        <article
          key={title}
          className="group/card relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:bg-card hover:shadow-xl hover:shadow-foreground/5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-foreground/5 text-foreground transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-foreground group-hover/card:text-background">
              <Icon className="size-5" />
            </div>
            <span className="font-mono text-[10px] font-semibold tracking-[.25em] text-muted-foreground/70">
              {tag}
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
