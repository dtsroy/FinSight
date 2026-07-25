---
name: 中文排版与 mono 小字的三条约束
description: 中文标题禁用 font-mono + 大 tracking；Dialog 内 w-full 深色按钮圆角要盖过外框避免"穿模"；mono eyebrow 只放英文代号，不能与下方中文标题重复
type: feedback
---

用户对压测页触发的两个 Dialog（AccountDialog 登录、ShareReportPanel 分享）提了两个视觉问题，一次搞掉，别再复发：

## 规则 1：中文 Dialog 标题不要 `font-mono` + 大字距

**Why**：中文字符是全角，本身间距就够；再叠加 `font-mono`（等宽会回退到系统 mono，中文字之间被强行拉齐）和 `tracking-[.18em]` 之类的 letter-spacing，就变成「登  入  你  的  账  户」这种明显撑开的碎裂观感，被用户抱怨过一次。

**How to apply**：
- 中文 Dialog 标题默认走 `text-xl font-semibold tracking-normal`（或 `tracking-tight`），必要时叠个 `text-primary` 强调色即可。
- `font-mono` + `tracking-[.15em]+` 这种视觉风格只在**纯英文短标签**（比如 "AGENT · X-RAY DONUT"、"CAPABILITIES"、`SCENARIO_META.badge` 里的 "STRESS TEST LAB"）上用，中文严禁。
- 英文小 label 用 `font-mono` 是 OK 的，但**长中文标题绝不用**。

## 规则 2：Dialog 内 `w-full` 深色高对比按钮要 `rounded-xl` + `h-11`

**Why**：shadcn Dialog 外框圆角是 `sm:rounded-lg`（8px），默认 Button 是 `rounded-md`（6px）+ `h-10`。当按钮 `w-full` 铺满时，按钮左右几乎顶到 Dialog 内 padding 边界，加上默认圆角比 Dialog 还小，视觉上按钮就像**"穿出了"Dialog 边框**——用户原话就叫"穿模"。这在纯黑高对比 primary 按钮上尤其明显。

**How to apply**：
- Dialog 内**任何 `w-full` 的 primary/深色按钮**统一改成 `h-11 w-full gap-2 rounded-xl`（12px 圆角 > Dialog 的 8px，视觉上按钮"被包在"外框内）。
- 已按此规则修好的两处（改动可参考）：
  - `src/components/desktop/AccountDialog.tsx` 提交按钮
  - `src/components/desktop/ShareReportPanel.tsx` "生成新分享链接"按钮
- 未来在 Dialog 里新增全宽 primary 按钮时按同样规格加，别只写 `w-full gap-2`。
- 非全宽的次要按钮（`variant="ghost"` / `variant="outline"` 或宽度 auto 的），保持默认 `rounded-md` 不必动。

## 规则 3：mono eyebrow 只放英文代号，不能重述中文标题

**Why**：卡片/页面的典型结构是「mono 小字 eyebrow + 中文主标题 + 一句描述」。若 eyebrow 也写中文，而后端返回的主标题又是同一个词，就变成同一句话连着说两遂（压测卡曾经就是 `2015 股灾` / `2015 股灾`、`失业 + 急用钱` / `失业+急用钱` 上下堆叠），用户直接问“为什么标题都提了两遂”。

**How to apply**：
- eyebrow 位置只放**英文/数字代号**，且语义不重叠主标题。压测页已改成：`CRASH · 2015` / `PANDEMIC · 2020` / `BEAR · 2022` / `LIQUIDITY SHOCK`（`SCENARIO_META.code`，`src/pages/desktop/StressTestPage.tsx`），中文名只由后端 `scenario_label` 出一次。
- 无法给出英文代号时，**宁可不渲染这行**（空字符串就不输出 `<p>`），也不要拿中文标题当 fallback 填进去。
- 卡片内的描述文案同理：已经在标题里出现过的场景名不要在紧邻的说明里再抬一次（例：月度支出那条说明已从“压力测试的失业+急用钱情景…”简化为“该数值决定断收情景下应急金能覆盖几个月”）。
