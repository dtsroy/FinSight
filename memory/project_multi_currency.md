---
name: 多币种支持与单一参考汇率原则
description: 财务 X 光 App 所有汇率相关运算（改币、批量改币、总资产聚合、诊断报告）都走同一套硬编码参考汇率（前端 CURRENCY_META.baseRate + Edge Function CURRENCY_BASE_RATE + DB RPC batch_change_currency）；assets.amount 列 numeric(20,8) 支撑无损精度；fx_rates 表与 get-fx-rates Edge Function 已停用但保留基础设施
type: project
---

财务 X 光 App 支持多币种资产（CNY/USD/HKD/EUR/GBP/JPY/SGD/KRW/TWD/AUD/CAD），资产表 `assets` 有独立的 `currency` 字段和 `numeric(20,8)` 的 `amount` 字段，数据库层用 `CHECK` 约束限死这 11 个 ISO 代码，OCR 识图和 CSV 解析都会识别金额符号并给出币种，账本表金额列按每条资产各自的币种符号展示。

**核心原则：单一汇率基准（single source of truth）**：整个 App 的所有汇率相关计算——改币种自动折算金额、总资产聚合、类别 / 平台占比、基金 X 光穿透、压力测试、AI 医生上下文、分享报告、批量改币——都用同一套硬编码参考汇率。

**Why**：改币和总资产聚合走同一套汇率，"换币种表达"才能保证人民币等值恒定，逻辑自洽。用户明确反对"改币会让 CNY 总额跳"的旧实现。

**How to apply**：

## 参考汇率的三个同步位置（改一处必改另外两处）
1. 前端 `src/lib/currency.ts` 的 `CURRENCY_META[code].baseRate`
2. Edge Function `supabase/functions/_shared/currency.ts` 的 `CURRENCY_BASE_RATE`
3. 数据库函数 `batch_change_currency`（migration `20260723193427_...`）里的 `CASE ... WHEN ...` 值

## 精度处理
- `assets.amount` 列类型 `numeric(20,8)`（最初是 `numeric(14,2)`，被审查发现会导致批量改币时 UPDATE 截断到分位，造成 CNY 总额掉几分钱；migration `20260723193624_...` 扩到 8 位小数彻底解决）。
- 前端 `convertAmount(amount, from, to)` **不 round**，返回全精度浮点。UI 显示层用 `formatAmountForInput`（默认 2 位小数）或 `formatByCurrency(..., detailed=true)`（`Intl.NumberFormat` 2 位）截断展示；保存到 DB 时用**精确浮点**，不用 UI 字符串重 parse。
- 三处改币入口的 form state 里都有 `amountPrecise?: number` sidecar：切币时同时写入 `amount`（显示字符串）和 `amountPrecise`（精确浮点）；用户手改 amount 时清空 amountPrecise；保存时 `amountPrecise ?? parseAmountInput(amount)` 优先精确值。
- 账本表加载资产时（`toAsset()`）用 `Number(row.amount)` 拿到浮点精度，展示层再截断。

## 前端改币的四个入口
1. `src/components/desktop/import/ManualAssetForm.tsx`（手动录入）
2. `src/components/desktop/import/ParsedAssetsReview.tsx`（CSV / OCR 核对页每行）—— row.amount 是 number，直接接精确浮点，无需 sidecar
3. `src/pages/desktop/AssetsPage.tsx` 内部的 `EditAssetDialog`（编辑资产弹窗）
4. `src/pages/desktop/AssetsPage.tsx` 的 `BatchEditDialog`（批量改币种）—— 走 RPC，per-row 换算

## 批量改币的 RPC 通道
- 数据库函数 `public.batch_change_currency(target_ids uuid[], target_currency text) returns int`
- `security invoker`，跑在调用者身份下，RLS 自动约束到 `auth.uid()` 名下的行
- 内部 `UPDATE ... SET amount = amount * baseRate[old_currency] / baseRate[new_currency], currency = target_code`，per-row 换算 + 落库
- 前端 `assetService.batchUpdateAssets(ids, patch)` 检测到 `patch.currency` 时调 RPC；platform/category 走原 bulk update
- BatchEditDialog 币种字段的提示文案："已选的每一项都会按内置参考汇率同步折算金额，人民币等值不变（例如 100 CNY → 14.08 USD）"

## 数据校验与写入（不变）
- 前端 `toValidCurrency()` 和数据库 `assets_currency_check` 约束 + `commit_import_batch` 的 `CASE ... IN (...)` 兜底确保写入必是 11 个支持代码之一
- 前端 `AssetSummary.converted` 标志位（存在任意非 CNY 资产即为 true），页面在总资产卡片上显示"含外币（折算）"提示
- X 光穿透 / 压力测试 / AI 医生 / 分享报告都在 Edge Function 端调用 `_shared/currency.ts` 的 `toBaseAmount` 完成 CNY 折算后再聚合

## fx_rates 表与 get-fx-rates Edge Function：**已停用但保留**
- 曾用于给"改币种表达"提供当日实时汇率，但导致 CNY 总额跳动被用户明确否决
- 前端 `useFxRates` 与 `fxService.ts` 保留在仓库但没有任何 import 引用
- 表结构、Edge Function 代码、种子数据保留，未来若切换到"总资产也用今日汇率"，改 Edge Function 端 `_shared/currency.ts` + 前端 `convertAmount` 传参即可
- 表 seed 值与 `CURRENCY_META.baseRate` 保持一致，任何一处更新参考汇率都要同步表 seed

## 增加新币种时的 checklist
1. 前端 `CURRENCY_META` 加常量（含 baseRate）与顺序
2. Edge Function `CURRENCY_BASE_RATE` + `SUPPORTED_CURRENCIES` 加常量
3. DB `batch_change_currency` 函数的两处 `CASE` 添加新币种
4. DDL 迁移新增 `assets_currency_check` 值 + `fx_rates_supported` 值 + 更新 `commit_import_batch` RPC 的 `CASE`
5. OCR system prompt 加符号规则
6. CSV `normalizeCurrency` 加别名
7. `fx_rates` 表新增该币种 seed 行

## 通用 helper 位置
- `parseAmountInput(raw)` 与 `formatAmountForInput(num)` 抽在 `src/lib/currency.ts`，四处改币入口共享
- `convertAmount(amount, from, to)` 也在 `src/lib/currency.ts`，**不 round**，返回全精度
