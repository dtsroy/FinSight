---
name: Landing 页版式 — 海报级五层结构 + 双雷达 + 反向 marquee
description: Landing 页 `/` 是产品主页也是可导出海报，共五层结构；Section 2 双雷达卡直接复用 X 光页组件；两行反向 marquee 的 logo 卡走"占位优先、SVG 后到"的接入约定
type: project
---

# Landing 页版式 — 海报级五层结构 + 双雷达 + 反向 marquee

Landing 页 `/` 承担双角色：**对新用户**是产品介绍与试玩入口，**对团队**是可直接截图分享的宣传海报。因此每一层都要在信息密度、视觉冲击、可扫读三个维度同时成立。

## 五层结构（自上而下）

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Hero 主标语（Pawn 哲学 / 循环 highlight 词 / 两个 CTA）      │
├─────────────────────────────────────────────────────────────────┤
│ 2. 双雷达面板并排（都套 XRayScannerPanel 医学影像外壳）         │
│    ├─ 左：StockShareDonut · 穿透后个股相对占比环形图            │
│    └─ 右：IndustryDistributionBar · 完整行业分布横向柱状图      │
├─────────────────────────────────────────────────────────────────┤
│ 3. 六件武器 · 3×2 能力卡（导入 ×2 · 行情 ×1 · 诊断 ×3）         │
├─────────────────────────────────────────────────────────────────┤
│ 4. STACK · 使用的服务（无限横向 marquee，从右向左）             │
├─────────────────────────────────────────────────────────────────┤
│ 5. COMPATIBILITY · 支持 OCR 的银行 / 机构（marquee，从左向右）  │
└─────────────────────────────────────────────────────────────────┘
```

第 4 层与第 5 层的滚动方向必须相反，视觉上形成"两条反向流"的呼吸感；hover 会自动暂停以便用户细看某个 logo。

## Section 2 · 双雷达面板设计约定（重要）

**核心决定**：不用假 3D 面板、不用产品截图 StackShot，而是**直接复用 X 光页的两个真实可视化组件**，套上医学影像雷达外壳。这样 Landing 上"看到的图" = 用户登录后"实际得到的图"，产品叙事零割裂；hover tooltip 交互也一次到位。

- 左卡：`StockShareDonut` from `@/components/desktop/xray/StockShareDonut`
- 右卡：`IndustryDistributionBar` from `@/components/desktop/xray/IndustryDistributionBar`
- 外壳：`XRayScannerPanel` from `@/components/desktop/landing/XRayScannerPanel`，承包 scanner-line 扫描动画、鼠标追随的 3D 倾斜、AGENT header、"诊断分析中"呼吸徽章、footer 说明。
- 数据：`LandingPage.tsx` 顶部两个静态 mock 常量 `XRAY_DONUT_MOCK` / `XRAY_INDUSTRY_MOCK`，数值取自演示组合"小王"真实穿透输出，游客无需登录即可看到真实感十足的图。**不要**在 Landing 上真调 `useLatestXRay` / `useRunXRay`，那会引入 loading 态、破坏海报截图效果，也会强制未登录用户跑 API。
- 数据来源变了 → 更新 mock 常量的数字即可，两个可视化组件本身零改动。

## 已废弃的 Section 2 设计（避免走回头路）

- **stack.png 产品截图 + StackShot 组件**：曾经用来跟旧的假 3D 雷达并排，被用户明确否掉（"不好看"）。`src/components/desktop/landing/StackShot.tsx` 文件保留但已不被引用，如需彻底清理可直接删除；不要再往 Landing 引入这个组件。
- **假的 3D Alarm Panel**（贵州茅台 18.5% + 高危行业集中度 60%+ + 流动性储备 <3 个月）：那份"虚构数字面板"已经被真实的两张 X 光雷达替代，不要再复活。

## 关键文件位置

- 页面本体：`src/pages/desktop/LandingPage.tsx` —— 只做 section 编排 + 常量，不写视觉细节。
- 每个 section 的 UI 子组件位于 `src/components/desktop/landing/`：
  - `XRayScannerPanel.tsx` —— 医学影像雷达外壳（scanner-line + 鼠标追随 3D 倾斜 + AGENT header + 徽章）
  - `FeatureCards.tsx` —— 六件武器 3×2 卡片（icons + tag + title + text）
  - `LogoMarquee.tsx` —— 通用横向滚动 logo 卡组，`direction: "left" | "right"` 反向
  - `LandingSectionHeader.tsx` —— 三段式标题（eyebrow / title / desc）
  - `StackShot.tsx` —— **已停用**，见上文"已废弃设计"
- X 光页复用组件（Landing 与 /xray 共享）：`src/components/desktop/xray/StockShareDonut.tsx` · `IndustryDistributionBar.tsx`
- Marquee 无缝滚动的 CSS keyframes 在 `src/index.css`：`.marquee-track`（左滑）/ `.marquee-track-reverse`（右滑）/ `.marquee-wrapper`（左右 mask 渐隐 + hover 暂停）。

## Marquee 空位卡的 SVG 接入约定

两组 marquee 的 items 目前**只写 label / note，没有 src**，`LogoMarquee` 组件会把没 src 的项渲染成 dashed 边框 + "SVG · PENDING" 占位卡。

补 svg 时的最小改动：直接在 `LandingPage.tsx` 顶部的 `SERVICES` / `OCR_BRANDS` 常量里，把对应项的 `src` 字段补上即可。示例：
```ts
import cmbLogo from "@/assets/bank-logos/cmb.svg";
const OCR_BRANDS: LogoMarqueeItem[] = [
  { label: "招商银行", src: cmbLogo }, // ← 只加 src，其他不动
  ...
];
```

**不要**为了补 svg 修改 `LogoMarquee.tsx` 本身的渲染代码 —— 它是数据驱动的，加图 = 加字段。

## 六件武器 3×2 卡的内容契约

- 卡片文案在 `FeatureCards.tsx` 的 `FEATURES` 常量里，跟 README「核心架构」三大板块（INGEST / MARKET / DIAGNOSE）一一对齐。
- 每张卡带一个 tag（INGEST / MARKET / DIAGNOSE），既是分区标记又是海报截图时的视觉锚点。
- 图标一律走 lucide-react，避免混用 SVG 字体导致海报截图不清晰。
- 增删 feature 时同步 README 的"核心架构与功能"章节，避免落地页和 README 讲的能力不一致。

## 海报导出约束

- 页面用户会拿去截长图做海报，因此：
  1. 所有 section 必须在浅色 / 深色两套主题下都成立，不能有硬编码 `bg-white` / `text-black`；
  2. 不使用平台专属的 CSS 特性（如 backdrop-filter 已经加了，兼容 fallback 为半透明底）；
  3. 不写"仅在鼠标悬浮时才显示"的关键信息，海报截图看不到 hover 态。Section 2 的雷达 hover tooltip 属于"锦上添花，非关键信息"—— 无 hover 时数字已经全在饼图 legend / 柱状图 axis 上。
- 具体的 html-to-image 导出流程由用户自己在 `.superun/skills/skill.canvas_export/` 里做，README 描述保持"可截图分享"这一句抽象结论即可，无需涉及技术细节。
