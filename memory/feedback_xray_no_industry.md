---
name: X 光页面三块视图 + 行业只用真实外部接口
description: X-Ray 现在展示 Top10 / Top5 行业 / 跨基金重仓预警三块；行业不再从本地表推，而是按 code 逐只调 Panda AI Quant 真实接口后聚合
type: feedback
---

# X 光页面：三块视图 + 行业只用真实外部接口

（本记忆先后经历两次重要迭代，最新事实是：**三块视图，行业已通过外部真实接口回归**。）

## 当前真实布局（v2，2026-07-25 起）

X 光页面 `src/pages/desktop/XRayPage.tsx` 展示三块：

1. **Top 10 穿透后个股**
   - React key、主标题都是 `stock_code`，名称走 `useStockNames` 异步补齐显示成 `名称（代码）`。
   - 头部有"未穿透金额提示"：当 `unmatched_funds` 里有金额（无代码 / 底稿未收录 / 披露不足）时，会醒目提示总金额和占比，避免 Top10 分母造成的"假分散"错觉。

2. **Top 5 行业**（v2 新加回来）
   - 对全部穿透后个股（基金按披露权重折算你的实际金额 + 直接持股）逐只调 `useStockIndustries` → `stockIndustryService.fetchStockIndustriesByCodes` → 本地 Python 后端 `GET /get_industry_from_code`（Panda AI Quant `sector_code_name`）拿真实行业。
   - 聚合后按金额 desc 取 Top 5，>25% warning，>40% destructive。
   - 查不到行业的个股金额单独在下方以"另有 ¥N 的穿透个股未能识别行业"提示，绝不落到"其他"里让整张图变幻觉。

3. **跨基金重仓预警**
   - 同一支股票被 **2+ 只不同基金**（按 fund_code 去重，不是 sources.length）同时重仓。
   - 只挑最明显的几只：先按 `total_pct` desc，只保留 `total_pct ≥ 1%`，最多 5 条。常量在 `XRayPage.tsx` 顶部：`DUPLICATE_ALERT_MIN_PCT = 1`、`DUPLICATE_ALERT_MAX_COUNT = 5`。
   - 收敛数量必须明显少于 Top10（10 vs ≤5），否则两块看起来重复。

## 关键设计原则（跨版本都成立）

- **个股展示以 code 为主标题**：`stock_code` 是 React key、是显示主体；名称通过 `src/services/stockNameService.ts` 的 `fetchStockNamesByCodes` 异步补齐（Panda AI Quant `get_name_from_code`），未拿到就只显示 code，不假装知道。
- **`__nocode_<uuid>` 内部占位符绝不能泄漏到用户面**：`compute-xray-report` 生成告警时会替换成"未标注个股"；分享报告 `create-shared-report` 的 `sanitizeAlerts` 会二次兜底 regex 清洗；`SharedReportPage.tsx` 读侧还会兜底一层。任何新增的 X 光文案输出都要走这套脱敏。
- **披露不足要单独进 `unmatched_funds` 并在页面头部提示**：Edge Function 计算完基金披露的加权分摊后，`residualPct = max(0, 100 - disclosedWeight)`，>0.5% 的残值单独 push 到 `unmatched_funds` 并带 reason=`披露不足（仅披露 X%）`，前端展示"另有 ¥N（约占总资产 X%）的基金仓位未被穿透"。
- **Edge Function 数据库中性写入**：`xray_reports` 里 `concentration_score / top_industry / top_industry_pct / industry_exposure` 是历史遗留列，`compute-xray-report` 现在写 `0 / null / null / []`，不删表、不迁移；前端类型里也不再暴露它们。
- **风险规则维度**：`src/services/riskService.ts` 的 `RiskBasis` 只有 `top_stock_pct / emergency_months / max_loss_pct`；Dashboard 的健康分和"Top1 单票占比"卡片基于 Top1 单票 pct，不再用 `concentration_score`。
- **告警等级约定**：Critical / Warning 只留给单票 >15% 与现金 <10%；跨基金重仓和存在未穿透基金都是 Warning / Info 级；一定要与 README 里的等级说明保持一致。

## Why 行业能重新出现

v1 的行业维度是从本地 `stock_industry` 表反推，覆盖率极低（个位数百分比），推出来的"行业分布"基本是幻觉。用户明确反馈"不要试图从代码推出行业然后做一些无意义的总结"，所以整个删掉。

v2 之所以能加回来，是因为接入了 **Panda AI Quant** 的官方 `get_stock_detail` → `sector_code_name` 字段（走本地 Python 后端 `/get_industry_from_code`），这是可信的真数据源。查不到的股票被明确画成"未识别行业金额"—— 数据源覆盖率优先原则依然成立，只是这次真的达标了。

## How to apply

- 想上任何新聚合维度（行业 / 板块 / 主题 / 风格）之前，先回答：**数据源覆盖率是否 ≥ 90%？** 不够就不做，或者把"未知"占比明确画出来。绝不做"其他 / 未知"兜底桶。
- 用户上传的字段能力有限时，别在 UI 上假装我们"算出来了"某个属性 —— 保留原字段（code）、把加工能力放在可替换的接口里（`stockNameService` / `stockIndustryService` 那种），等真数据接进来后只替换服务实现，UI 不动。
- 跨页面的产品维度调整（增删聚合维度）一定要同步：类型定义 / X 光页 / Dashboard / 分享报告 sanitize / AI chat 上下文 / 风险规则 / README。任何一处漏改都会让产品叙事崩掉；上一版删行业时就漏了 `ai-doctor-chat` 与 `run-stress-test` 两个 edge function，被代码审查兜出来 7 P1。
