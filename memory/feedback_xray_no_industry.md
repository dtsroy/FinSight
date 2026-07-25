---
name: X 光页面只保留 Top10 与跨基金重仓预警
description: X-Ray 展示层已彻底去掉"行业"维度，个股名称走前端预留接口按 code 查询，不再从本地数据反推
type: feedback
---

# X 光页面只保留 Top10 与跨基金重仓预警

- X 光页面只展示两块：**Top 10 穿透后个股** 和 **跨基金重仓预警**。所有"行业分布 / 行业集中度 / 单一行业告警 / concentration_score（前三行业权重合计）"都已从 UI 和后端计算中拿掉。
- 个股展示以 **stock_code 为主标题**（React key 也是 stock_code）。个股名称通过 `src/services/stockNameService.ts`（`fetchStockNamesByCodes`）预留的接口异步补齐；名称接口目前返回空对象，用户后续会接入真实 API，届时只需替换该函数实现，UI 不需要改。展示时未拿到名称就只显示 code，不做任何猜测。
- 重仓预警要"挑最明显的几个"，不能和 Top10 一样密：先按合计占比 desc，只保留 `total_pct ≥ 1%`，最多 5 条。相关常量在 `XRayPage.tsx` 顶部 `DUPLICATE_ALERT_MIN_PCT` / `DUPLICATE_ALERT_MAX_COUNT`。
- Edge Function `compute-xray-report` 已不再查询 `stock_industry` 表（该表提供的股票名称也一并放弃使用）。历史遗留的数据库列 `concentration_score / top_industry / top_industry_pct / industry_exposure` 仍保留，写入时给中性值（0 / null / []），未做迁移；前端类型定义已不再暴露它们。
- 风险规则 `src/services/riskService.ts` 的 `RiskBasis` 已删掉 `top_industry_pct` 维度，现在只有 `top_stock_pct / emergency_months / max_loss_pct` 三项；Dashboard 的健康分和"X 光集中度"卡片也已改为基于 Top1 单票占比。
- Dashboard 的"关键风险预警"卡片和分享报告的 alerts 展示保留，但 alerts 内容里已经没有"行业暴露过高"这一条。

**Why**: 我们不掌握完整、可信的"股票 → 行业"映射（`stock_industry` 表只覆盖极少一部分底稿），一旦用未匹配的股票默认落到"其他"，"行业分布"整张图就都是幻觉。用户明确反馈"不要试图从代码推出行业然后做一些无意义的总结"——宁可不展示，也不做低质量总结。

**How to apply**:
- 未来做类似的"聚合展示"（行业 / 板块 / 主题 / 风格），先问：**数据源覆盖率是否 ≥ 90%？**不够就不做，或者把"未知"占比明确画出来提醒用户。
- 用户上传的数据字段能力有限时，别在 UI 上假装我们"算出来了"某个属性——一定要保留原字段（code / 名称），把加工能力放在可替换的接口里，等真数据接进来。
- 涉及跨页面的产品维度删除（比如去掉"行业"），一定要同时清理：类型定义 / 前端展示 / edge function 输出 / 分享快照 sanitize / 风险规则 / 首页文案，任何一处漏改都会让"这个维度已删除"的产品叙事崩掉。
