# Project Memory Index

- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面只保留 Top10 与跨基金重仓预警](feedback_xray_no_industry.md) — 删了行业维度；个股名称走 stockNameService 预留接口按 code 异步补齐，不再从本地反推。
