<<<<<<< local
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
- **两卡等高机制**：StockShareDonut 自然高约 208px，IndustryDistributionBar 按 `items.length * 36 + 40` 算出来大约 292px，两者天然差 60-80px。靠三层接力拉齐：
  1. Section 2 的 grid 必须带 `items-stretch`；
  2. `XRayScannerPanel` 外定 `h-full`、内层 tilt div 带 `flex h-full flex-col`；
  3. children 容器写 `flex flex-1 items-center`，让图表在剥除 header/subtitle/footer 后的剩余空间里垂直居中。
  需要把 Section 2 换成其他组件时，保留这三段 CSS，否则两卡会回到各发各高。

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
||||||| base
---
name: Landing 页版式 — 海报级五层结构 + 双雷达 + 反向 marquee
description: Landing 页 `/` 是产品主页也是可导出海报，共五层结构；Section 2 双雷达卡直接复用 X 光页组件；两行反向 marquee 有服务栈 / 品牌墙两种展示模式（hideLabel 切换），品牌墙固定白底
type: project
---
=======
---
name: Landing 页版式 — 海报级五层结构 + 双雷达 + 反向 marquee
description: Landing 页 `/` 是产品主页也是可导出海报，共五层结构；Section 2 双雷达卡直接复用 X 光页组件；STACK 区是三张固定技术卡（位图 logo 走 CDN 常量），COMPATIBILITY 区是白底品牌墙 marquee
type: project
---
>>>>>>> remote

<<<<<<< local
||||||| base
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
│ 4. STACK · 使用的服务（服务栈模式 marquee，从右向左）           │
├─────────────────────────────────────────────────────────────────┤
│ 5. COMPATIBILITY · 支持 OCR 的银行 / 机构（品牌墙模式，左→右）  │
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
- **两卡等高机制**：StockShareDonut 自然高约 208px，IndustryDistributionBar 按 `items.length * 36 + 40` 算出来大约 292px，两者天然差 60-80px。靠三层接力拉齐：
  1. Section 2 的 grid 必须带 `items-stretch`；
  2. `XRayScannerPanel` 外定 `h-full`、内层 tilt div 带 `flex h-full flex-col`；
  3. children 容器写 `flex flex-1 items-center`，让图表在剥除 header/subtitle/footer 后的剩余空间里垂直居中。
  需要把 Section 2 换成其他组件时，保留这三段 CSS，否则两卡会回到各发各高。

## 已废弃的 Section 2 设计（避免走回头路）

- **stack.png 产品截图 + StackShot 组件**：曾经用来跟旧的假 3D 雷达并排，被用户明确否掉（"不好看"）。`src/components/desktop/landing/StackShot.tsx` 文件保留但已不被引用，如需彻底清理可直接删除；不要再往 Landing 引入这个组件。
- **假的 3D Alarm Panel**（贵州茅台 18.5% + 高危行业集中度 60%+ + 流动性储备 <3 个月）：那份"虚构数字面板"已经被真实的两张 X 光雷达替代，不要再复活。

## 关键文件位置

- 页面本体：`src/pages/desktop/LandingPage.tsx` —— 只做 section 编排 + 常量，不写视觉细节。
- 每个 section 的 UI 子组件位于 `src/components/desktop/landing/`：
  - `XRayScannerPanel.tsx` —— 医学影像雷达外壳（scanner-line + 鼠标追随 3D 倾斜 + AGENT header + 徽章）
  - `FeatureCards.tsx` —— 六件武器 3×2 卡片（icons + tag + title + text）
  - `LogoMarquee.tsx` —— 通用横向滚动 logo 卡组，支持 `direction: "left" | "right"` 与 `hideLabel: boolean` 两种展示模式
  - `LandingSectionHeader.tsx` —— 三段式标题（eyebrow / title / desc）
  - `StackShot.tsx` —— **已停用**，见上文"已废弃设计"
- X 光页复用组件（Landing 与 /xray 共享）：`src/components/desktop/xray/StockShareDonut.tsx` · `IndustryDistributionBar.tsx`
- Marquee 无缝滚动的 CSS keyframes 在 `src/index.css`：`.marquee-track`（左滑）/ `.marquee-track-reverse`（右滑）/ `.marquee-wrapper`（左右 mask 渐隐 + hover 暂停）。

## Marquee 两种展示模式（hideLabel 参数）

`LogoMarquee` 支持两种视觉形态，由 `hideLabel` 参数切换：

1. **默认（hideLabel=false）—— 服务栈模式**：logo + label（+ 可选 note），透明卡片、backdrop-blur。用于 STACK 那一行"使用的服务"，logo 尺寸不一致时靠文字兜底可读性。
2. **hideLabel=true —— 品牌墙模式**：只显示 logo，套统一的白底圆角卡片（卡片 `h-[116px]` / `rounded-2xl` / `bg-white` / shadow-sm + ring，logo 本体 `max-h-[84px]`）。用于 COMPATIBILITY 那一行“支持 OCR 的银行 / 机构”——品牌 logo 都自带品牌色，白底能让不同银行 logo 在同一条带里视觉稳定统一，肉眼扫过就是“一堵品牌墙”而不是“文字列表”。LandingPage 调用时传 `cardWidth={210}`，让 SVG 图形在卡片内占满尺寸（之前 `88px + 160` 看着偏小，已改）。

**关键规则**：品牌墙模式的 `bg-white` 是有意保留，不改成主题变量。品牌 logo 的固有颜色（红/蓝/橙/绿都有）只有在白底上才能保持品牌一致性，跟随主题变深会让 logo 糊掉。这是"海报导出约束条款 1"的合法例外，仅限品牌 logo 展示卡。

## Marquee logo 接入约定

- **OCR_BRANDS**：直接挂 `src/assets/bank-logos/att-1.svg` ~ `att-8.svg`（用户明确提供给 Landing OCR marquee 轮播的 8 张矢量素材），label 只用作 React key（`brand-1` ~ `brand-8`），hideLabel 隐藏后不出现在视觉里。**不需要也不应该去处理「这张 svg 是哪家银行」的问题** —— 用户已明确说明这些就是一组累高展示密度的备用矢量，与 `lib/bank-logos.ts` 里那批品牌名命名的 svg 是两套独立的资源。补新素材：正常取名 `att-N.svg`（N 递增）并在 `LandingPage.tsx` OCR_BRANDS 追加 `{ label, src }` 即可。
- **SERVICES**：技术栈 logo 目前仍是空位占位（`LogoMarquee` 会渲染 dashed 边框 + "SVG · PENDING"）。用户补 svg 时同样只需加 `src` 字段。
- **不要**为了补 svg 修改 `LogoMarquee.tsx` 本身的渲染代码 —— 它是数据驱动的，加图 = 加字段。

## `src/assets/bank-logos/` 素材类型说明

目录下的 svg 分两类，用途完全独立：

- **品牌名命名的**（`cmb.svg` / `icbc.svg` / `boc.svg` / `abc.svg` / `bocom.svg` / `ccb.svg` / `citic.svg` / `cib.svg` / `spb.svg` / `pingan.svg` / `hsbc.svg` / `scb.svg` / `ceb.svg`=同花顺 / `alipay.svg` / `wechat.svg`）—— 给 `AssetsPage`/`lib/bank-logos.ts` 的「平台」列展示用，文件名与品牌的对应关系由用户直接约定，不要猜。这批**不用来做 Landing marquee**。
- **`att-<index>.svg`**（1..8）—— 用户明确上传给 Landing 页 OCR marquee 轮播的 8 张矢量素材。**不需要也不应该去问「这张 svg 是哪家银行」** —— 用户已声明这就是一组累高展示密度的备用矢量。它们不会被 `lib/bank-logos.ts` 的匹配器引用，仅由 `LandingPage.tsx` 的 OCR_BRANDS 直接 import 展示。

## 六件武器 3×2 卡的内容契约

- 卡片文案在 `FeatureCards.tsx` 的 `FEATURES` 常量里，跟 README「核心架构」三大板块（INGEST / MARKET / DIAGNOSE）一一对齐。
- 每张卡带一个 tag（INGEST / MARKET / DIAGNOSE），既是分区标记又是海报截图时的视觉锚点。
- 图标一律走 lucide-react，避免混用 SVG 字体导致海报截图不清晰。
- 增删 feature 时同步 README 的"核心架构与功能"章节，避免落地页和 README 讲的能力不一致。

## 海报导出约束

- 页面用户会拿去截长图做海报，因此：
  1. 所有 section 必须在浅色 / 深色两套主题下都成立，不能有硬编码 `bg-white` / `text-black`。**例外**：COMPATIBILITY 品牌墙的 `bg-white` 是有意保留的（品牌 logo 需要固定白底才能保持品牌色一致性），详见「Marquee 两种展示模式」章节；
  2. 不使用平台专属的 CSS 特性（如 backdrop-filter 已经加了，兼容 fallback 为半透明底）；
  3. 不写"仅在鼠标悬浮时才显示"的关键信息，海报截图看不到 hover 态。Section 2 的雷达 hover tooltip 属于"锦上添花，非关键信息"—— 无 hover 时数字已经全在饼图 legend / 柱状图 axis 上。
- 具体的 html-to-image 导出流程由用户自己在 `.superun/skills/skill.canvas_export/` 里做，README 描述保持"可截图分享"这一句抽象结论即可，无需涉及技术细节。

=======
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
│ 4. STACK · 我们使用的技术（三张白底卡固定居中，不滚动）         │
├─────────────────────────────────────────────────────────────────┤
│ 5. COMPATIBILITY · 支持 OCR 的银行 / 机构（品牌墙 marquee，左→右）│
└─────────────────────────────────────────────────────────────────┘
```

第 4 层曾经也是一条 marquee（与第 5 层反向滚动），后由用户改成**固定居中的三张卡**：技术栈只有 3 个品牌，滚动反而显得内容单薄，静态排布更稳、更适合海报截图。第 5 层的 marquee 保留 hover 自动暂停，方便用户细看某个 logo。

## Section 2 · 双雷达面板设计约定（重要）

**核心决定**：不用假 3D 面板、不用产品截图 StackShot，而是**直接复用 X 光页的两个真实可视化组件**，套上医学影像雷达外壳。这样 Landing 上"看到的图" = 用户登录后"实际得到的图"，产品叙事零割裂；hover tooltip 交互也一次到位。

- 左卡：`StockShareDonut` from `@/components/desktop/xray/StockShareDonut`
- 右卡：`IndustryDistributionBar` from `@/components/desktop/xray/IndustryDistributionBar`
- 外壳：`XRayScannerPanel` from `@/components/desktop/landing/XRayScannerPanel`，承包 scanner-line 扫描动画、鼠标追随的 3D 倾斜、AGENT header、"诊断分析中"呼吸徽章、footer 说明。
- 数据：`LandingPage.tsx` 顶部两个静态 mock 常量 `XRAY_DONUT_MOCK` / `XRAY_INDUSTRY_MOCK`，数值取自演示组合"小王"真实穿透输出，游客无需登录即可看到真实感十足的图。**不要**在 Landing 上真调 `useLatestXRay` / `useRunXRay`，那会引入 loading 态、破坏海报截图效果，也会强制未登录用户跑 API。
- 数据来源变了 → 更新 mock 常量的数字即可，两个可视化组件本身零改动。
- **两卡等高机制**：StockShareDonut 自然高约 208px，IndustryDistributionBar 按 `items.length * 36 + 40` 算出来大约 292px，两者天然差 60-80px。靠三层接力拉齐：
  1. Section 2 的 grid 必须带 `items-stretch`；
  2. `XRayScannerPanel` 外定 `h-full`、内层 tilt div 带 `flex h-full flex-col`；
  3. children 容器写 `flex flex-1 items-center`，让图表在剥除 header/subtitle/footer 后的剩余空间里垂直居中。
  需要把 Section 2 换成其他组件时，保留这三段 CSS，否则两卡会回到各发各高。

## 已废弃的 Section 2 设计（避免走回头路）

- **stack.png 产品截图 + StackShot 组件**：曾经用来跟旧的假 3D 雷达并排，被用户明确否掉（"不好看"）。`src/components/desktop/landing/StackShot.tsx` 文件保留但已不被引用，如需彻底清理可直接删除；不要再往 Landing 引入这个组件。
- **假的 3D Alarm Panel**（贵州茅台 18.5% + 高危行业集中度 60%+ + 流动性储备 <3 个月）：那份"虚构数字面板"已经被真实的两张 X 光雷达替代，不要再复活。

## 关键文件位置

- 页面本体：`src/pages/desktop/LandingPage.tsx` —— 只做 section 编排 + 常量，不写视觉细节。
- 每个 section 的 UI 子组件位于 `src/components/desktop/landing/`：
  - `XRayScannerPanel.tsx` —— 医学影像雷达外壳（scanner-line + 鼠标追随 3D 倾斜 + AGENT header + 徽章）
  - `FeatureCards.tsx` —— 六件武器 3×2 卡片（icons + tag + title + text）
  - `LogoMarquee.tsx` —— 通用横向滚动 logo 卡组，支持 `direction: "left" | "right"` 与 `hideLabel: boolean` 两种展示模式（目前 Landing 只用 hideLabel 品牌墙模式调一次）
  - `LandingSectionHeader.tsx` —— 三段式标题（eyebrow / title / desc）
  - `StackShot.tsx` —— **已停用**，见上文"已废弃设计"
- X 光页复用组件（Landing 与 /xray 共享）：`src/components/desktop/xray/StockShareDonut.tsx` · `IndustryDistributionBar.tsx`
- Marquee 无缝滚动的 CSS keyframes 在 `src/index.css`：`.marquee-track`（左滑）/ `.marquee-track-reverse`（右滑）/ `.marquee-wrapper`（左右 mask 渐隐 + hover 暂停）。

## Marquee 两种展示模式（hideLabel 参数）

`LogoMarquee` 支持两种视觉形态，由 `hideLabel` 参数切换：

1. **默认（hideLabel=false）—— 服务栈模式**：logo + label（+ 可选 note），透明卡片、backdrop-blur。**Landing 页当前已无调用方**（STACK 区改成静态三卡后不再用 marquee），能力保留备用，不要因为"没人用"就删掉这条分支。
2. **hideLabel=true —— 品牌墙模式**：只显示 logo，套统一的白底圆角卡片（卡片 `h-[116px]` / `rounded-2xl` / `bg-white` / shadow-sm + ring，logo 本体 `max-h-[84px]`）。用于 COMPATIBILITY 那一行“支持 OCR 的银行 / 机构”——品牌 logo 都自带品牌色，白底能让不同银行 logo 在同一条带里视觉稳定统一，肉眼扫过就是“一堵品牌墙”而不是“文字列表”。LandingPage 调用时传 `cardWidth={210}`，让 SVG 图形在卡片内占满尺寸（之前 `88px + 160` 看着偏小，已改）。

**关键规则**：品牌墙模式的 `bg-white` 是有意保留，不改成主题变量。品牌 logo 的固有颜色（红/蓝/橙/绿都有）只有在白底上才能保持品牌一致性，跟随主题变深会让 logo 糊掉。这是"海报导出约束条款 1"的合法例外，仅限品牌 logo 展示卡。

## Marquee logo 接入约定

- **OCR_BRANDS**：直接挂 `src/assets/bank-logos/att-1.svg` ~ `att-8.svg`（用户明确提供给 Landing OCR marquee 轮播的 8 张矢量素材），label 只用作 React key（`brand-1` ~ `brand-8`），hideLabel 隐藏后不出现在视觉里。**不需要也不应该去处理「这张 svg 是哪家银行」的问题** —— 用户已明确说明这些就是一组累高展示密度的备用矢量，与 `lib/bank-logos.ts` 里那批品牌名命名的 svg 是两套独立的资源。补新素材：正常取名 `att-N.svg`（N 递增）并在 `LandingPage.tsx` OCR_BRANDS 追加 `{ label, src }` 即可。
- **不要**为了补 svg 修改 `LogoMarquee.tsx` 本身的渲染代码 —— 它是数据驱动的，加图 = 加字段。
- 原先那份 10 项占位的 `SERVICES` 常量（Superun AI Gateway / Panda AI Quant / FastAPI / React / Tailwind …）**已被删除**，STACK 区不再走 marquee，见下一节。

## STACK 区（Section 4）· 三张技术品牌卡

- 结构：`flex flex-wrap items-center justify-center gap-6`，每张卡 `h-[104px] w-[240px]`、白底圆角（`bg-white dark:bg-white/95` + shadow-sm + ring），内部 logo `max-h-[88px] max-w-[90%] object-contain`。宽度 240 与品牌墙 marquee 的 `cardWidth={240}` 对齐，两个 section 的卡片尺寸在视觉上是一套。
- 三张 logo 是**位图 PNG**（superun / Qoder / PandaAI），不是矢量图，所以**不进 `src/assets/`**，而是以 CDN URL 常量的形式写在 `LandingPage.tsx` 顶部：`superunLogo` / `qoderLogo` / `pandaLogo`。理由：位图无需构建期处理，CDN 直出可被浏览器独立缓存，也不用把二进制塞进仓库和构建产物。这与 `att-*.svg`（矢量、入仓库、走 import）是两种不同性质的素材，不要混为一谈。
- 换/加技术 logo：矢量图走 `src/assets/` + import；位图直接把新的 CDN URL 换进对应常量即可，卡片渲染代码零改动。

## `src/assets/bank-logos/` 素材类型说明

目录下的 svg 分两类，用途完全独立：

- **品牌名命名的**（`cmb.svg` / `icbc.svg` / `boc.svg` / `abc.svg` / `bocom.svg` / `ccb.svg` / `citic.svg` / `cib.svg` / `spb.svg` / `pingan.svg` / `hsbc.svg` / `scb.svg` / `ceb.svg`=同花顺 / `alipay.svg` / `wechat.svg`）—— 给 `AssetsPage`/`lib/bank-logos.ts` 的「平台」列展示用，文件名与品牌的对应关系由用户直接约定，不要猜。这批**不用来做 Landing marquee**。
- **`att-<index>.svg`**（1..8）—— 用户明确上传给 Landing 页 OCR marquee 轮播的 8 张矢量素材。**不需要也不应该去问「这张 svg 是哪家银行」** —— 用户已声明这就是一组累高展示密度的备用矢量。它们不会被 `lib/bank-logos.ts` 的匹配器引用，仅由 `LandingPage.tsx` 的 OCR_BRANDS 直接 import 展示。

## 六件武器 3×2 卡的内容契约

- 卡片文案在 `FeatureCards.tsx` 的 `FEATURES` 常量里，跟 README「核心架构」三大板块（INGEST / MARKET / DIAGNOSE）一一对齐。
- 每张卡带一个 tag（INGEST / MARKET / DIAGNOSE），既是分区标记又是海报截图时的视觉锚点。
- 图标一律走 lucide-react，避免混用 SVG 字体导致海报截图不清晰。
- 增删 feature 时同步 README 的"核心架构与功能"章节，避免落地页和 README 讲的能力不一致。

## 海报导出约束

- 页面用户会拿去截长图做海报，因此：
  1. 所有 section 必须在浅色 / 深色两套主题下都成立，不能有硬编码 `bg-white` / `text-black`。**例外**：COMPATIBILITY 品牌墙的 `bg-white` 是有意保留的（品牌 logo 需要固定白底才能保持品牌色一致性），详见「Marquee 两种展示模式」章节；
  2. 不使用平台专属的 CSS 特性（如 backdrop-filter 已经加了，兼容 fallback 为半透明底）；
  3. 不写"仅在鼠标悬浮时才显示"的关键信息，海报截图看不到 hover 态。Section 2 的雷达 hover tooltip 属于"锦上添花，非关键信息"—— 无 hover 时数字已经全在饼图 legend / 柱状图 axis 上。
- 具体的 html-to-image 导出流程由用户自己在 `.superun/skills/skill.canvas_export/` 里做，README 描述保持"可截图分享"这一句抽象结论即可，无需涉及技术细节。

>>>>>>> remote