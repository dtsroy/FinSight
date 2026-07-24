---
name: 平台标识只在只读展示区显示
description: 资产明细"平台"列显示品牌 SVG 标识，编辑/导入/筛选等"匹配阶段"必须保留原始文字，不能贴 logo
type: feedback
---

资产明细列表里的"平台"单元格展示时匹配已知品牌显示 SVG 标识 + 原文字组合；未匹配的照旧只显示文字。所有"匹配阶段"（编辑对话框、批量修改、导入映射、筛选下拉里的平台字段）仍必须走原始文字字段，不能出现 logo。

Why: 用户明确表达："在匹配的时候不要变，但是在确认之后在资产明细里面'平台'可以显示相关银行的标识/没有标识的就不变。" 匹配阶段一旦贴 logo 会让文字被压缩、影响输入/选择。

How to apply:
- 新增品牌时把 SVG 放进 `src/assets/bank-logos/`，并在 `src/lib/bank-logos.ts` 的 `PLATFORM_MATCHERS` 里追加关键词映射；关键词按"更长/更专"在前的顺序放。
- 展示走 `src/components/desktop/PlatformCell.tsx`，只在只读展示位（当前是 AssetsPage 明细表格的"平台"列）使用；不要把它塞进 EditAssetDialog / BatchEditDialog / AssetFilters。
- **文件名到品牌的对应由用户直接约定，不要凭 AI 视觉去猜**。当前约定：
  - `ccb.svg`  → 建设银行
  - `ceb.svg`  → 同花顺（文件名沿用历史命名，不再代表光大银行）
  - `cib.svg`  → 兴业银行
  - `citic.svg` → 中信银行
  - `cmb.svg`  → 招商银行
  - `hsbc.svg` → 汇丰银行
  - `scb.svg`  → 渣打银行
  - `spb.svg`  → 浦发银行
- 用户上传 SVG 时如果平台没透传文件名，务必让他口头告知对应关系；不要通过图形/颜色反推品牌（曾经猜错过一整批）。
- 该展示层与 OCR 识别流程无关，不要因此改动 OCR/资产录入相关的 AI 逻辑。
