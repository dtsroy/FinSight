---
name: 平台标识只在只读展示区显示
description: 资产明细"平台"列显示品牌 SVG 标识，编辑/导入/筛选等"匹配阶段"必须保留原始文字，不能贴 logo
type: feedback
---

资产明细列表里的"平台"单元格展示时匹配已知品牌显示 SVG 标识 + 原文字组合；未匹配的照旧只显示文字（并在文字前挂一个 `<Landmark />` 通用图标兜底）。所有"匹配阶段"（编辑对话框、批量修改、导入映射、筛选下拉里的平台字段）仍必须走原始文字字段，不能出现 logo。

Why: 用户明确表达："在匹配的时候不要变，但是在确认之后在资产明细里面'平台'可以显示相关银行的标识/没有标识的就不变。" 匹配阶段一旦贴 logo 会让文字被压缩、影响输入/选择。

## ⚠️ 当前有两处匹配代码，务必同步

用户在 `src/pages/desktop/AssetsPage.tsx` 里自己写了内联的 `getPlatformIcon`，AssetsPage 明细表格用的是这个函数（**不是 PlatformCell 组件**）。除此之外，`src/lib/bank-logos.ts` + `src/components/desktop/PlatformCell.tsx` 也维护了同一套映射，作为其他页面的复用入口。**新增品牌必须同时改这两处**，否则 AssetsPage 展示不会生效（曾经因为只改 lib 没改 AssetsPage 内联函数，用户看到大量品牌显示不出 logo 直接投诉）。

## 落地规范

- SVG 放进 `src/assets/bank-logos/`。
- 修改 `AssetsPage.tsx` 里的 `getPlatformIcon`：追加 `import` 和一行 `if (name.includes("<关键词>"))` 分支。
- 同步 `src/lib/bank-logos.ts` 的 `PLATFORM_MATCHERS`（相同关键词、相同 logo）。
- 关键词顺序按"更长/更专"优先，避免子串误匹配（例："中信银行"要在"中国银行"之前）。
- 用 `String.prototype.includes` 做子串匹配，允许"平安"命中"平安保险 / 平安银行"、"蚂蚁"命中"蚂蚁财富 / 蚂蚁金融"。
- **验收**：改完后必须用 `SupabaseRunQuery` 查一下 `SELECT DISTINCT platform FROM assets` 得到真实字段值，一个个跟关键词对表；不能凭"看起来能匹配"就说 OK。

## 文件名到品牌的当前约定

- `ccb.svg`     → 建设银行
- `ceb.svg`     → 同花顺（历史文件名沿用，不再代表光大银行）
- `cib.svg`     → 兴业银行
- `citic.svg`   → 中信银行
- `cmb.svg`     → 招商银行
- `hsbc.svg`    → 汇丰银行
- `scb.svg`     → 渣打银行
- `spb.svg`     → 浦发银行
- `icbc.svg`    → 中国工商银行
- `pingan.svg`  → 平安银行 / 平安保险
- `wechat.svg`  → 微信
- `alipay.svg`  → 支付宝 / 蚂蚁财富 / 蚂蚁金融
- `boc.svg`     → 中国银行
- `abc.svg`     → 农业银行
- `bocom.svg`   → 交通银行
- 天天基金：暂用 CDN URL 常量 `TTJJ_LOGO`（用户上传的 PNG，Superun CDN 长期稳定），未来有 SVG 时换成本地。

## 血泪教训

- 用户上传 SVG 时，Superun 平台不会把文件名透传给 agent。**必须让用户口头告诉你文件对应哪个品牌**，绝不要凭图形 / 颜色反推（历史上错过一整批，被用户批评过 3 次）。
- 该展示层与 OCR 识别流程无关，不要因此改动 OCR / 资产录入相关的 AI 逻辑。
