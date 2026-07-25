# Project Memory Index

- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面三块视图 + 行业只用真实外部接口](feedback_xray_no_industry.md) — Top10 / Top5 行业 / 跨基金重仓预警三块；行业已通过 Panda AI Quant 真实接口回归，查不到就明确画"未识别行业金额"。
- [金融数据源双引擎（Panda AI Quant + 同花顺）](project_quote_backend.md) — 涨跌 / 股票名称 / 行业 / 基金重仓全部走本地 Python FastAPI + cpolar HTTPS 隧道，不走 Superun 云端。
