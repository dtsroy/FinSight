# Project Memory Index

- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面 2×2：三块列表 + 两张图表（个股环形 + 行业柱状）](feedback_xray_no_industry.md) — Top10 / Top5 行业 / 跨基金重仓三列表，右列搭配完整行业分布柱状图与穿透后个股占比环形图；行业均走 Panda AI Quant 真实接口，查不到明确画"未识别"。
- [金融数据源双引擎（Panda AI Quant + 同花顺）](project_quote_backend.md) — 涨跌 / 股票名称 / 行业 / 基金重仓全部走本地 Python FastAPI + cpolar HTTPS 隧道，不走 Superun 云端。
- [Landing 页版式——五层海报结构 + 反向 marquee 空位占位](project_landing_layout.md) — Hero / X-Ray+StackShot 并排 / 六件武器 / 服务 marquee / OCR 机构 marquee；logo 卡空位完全数据驱动，只需改 items 的 src 字段。
