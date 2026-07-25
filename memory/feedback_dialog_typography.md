---
name: Dialog 中文排版与全宽按钮圆角
description: 中文 Dialog 标题禁用 font-mono + 大 tracking；Dialog 内 w-full 深色按钮圆角要盖过外框，避免"穿模"观感
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
