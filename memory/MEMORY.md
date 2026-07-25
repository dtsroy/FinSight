# Project Memory Index

- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面 2×2：三块列表 + 两张图表（个股环形 + 行业柱状）](feedback_xray_no_industry.md) — Top10 / Top5 行业 / 跨基金重仓三列表，右列搭配完整行业分布柱状图与穿透后个股占比环形图；行业均走 Panda AI Quant 真实接口，查不到明确画"未识别"。
- [金融数据源双引擎（Panda AI Quant + 同花顺）](project_quote_backend.md) — 涨跌 / 股票名称 / 行业 / 基金重仓全部走本地 Python FastAPI + cpolar HTTPS 隧道，不走 Superun 云端。
- [Landing 页版式——五层海报结构 + 反向 marquee 空位占位](project_landing_layout.md) — Hero / X-Ray+StackShot 并排 / 六件武器 / 服务 marquee / OCR 机构 marquee；logo 卡空位完全数据驱动，只需改 items 的 src 字段。
- [Dialog 中文排版与全宽按钮圆角](feedback_dialog_typography.md) — 中文 Dialog 标题禁用 font-mono + 大 tracking；Dialog 内 w-full 深色按钮统一 h-11 rounded-xl 避免“穿模”。

<<<<<<< local
||||||| base
- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面 2×2：三块列表 + 两张图表（个股环形 + 行业柱状）](feedback_xray_no_industry.md) — Top10 / Top5 行业 / 跨基金重仓三列表，右列搭配完整行业分布柱状图与穿透后个股占比环形图；行业均走 Panda AI Quant 真实接口，查不到明确画"未识别"。
- [金融数据源双引擎（Panda AI Quant + 同花顺）](project_quote_backend.md) — 涨跌 / 股票名称 / 行业 / 基金重仓全部走本地 Python FastAPI + cpolar HTTPS 隧道，不走 Superun 云端。
- [Landing 页版式——五层海报结构 + 双雷达 + 反向 marquee](project_landing_layout.md) — Hero / 双雷达 / 六件武器 / 服务栈 marquee / 品牌墙 marquee；品牌墙走 hideLabel + 白底统一外框，OCR marquee 直接轮播 `att-1..8.svg` 备用矢量（不处理对应哪家银行）。
- [Dialog 中文排版与全宽按钮圆角](feedback_dialog_typography.md) — 中文 Dialog 标题禁用 font-mono + 大 tracking；Dialog 内 w-full 深色按钮统一 h-11 rounded-xl 避免“穿模”。

=======
- [批量与拖拽上传偏好](feedback_batch_and_drag_drop.md) — 文件类入口默认给"多文件 + 拖拽 drop zone"，不要只做单文件点击版本。
- [多币种与单一参考汇率原则](project_multi_currency.md) — 所有汇率运算（改币、批量改币、总资产、X光、压测、分享报告）都走同一套参考汇率；fx_rates 表与 get-fx-rates 已停用但保留。
- [平台标识只在只读展示区显示](feedback_bank_logo_display.md) — 资产明细「平台」列可贴 logo；编辑/批修/导入/筛选仍走原文字。文件名对应品牌由用户直接约定，不要猜。
- [X 光页面 2×2：三块列表 + 两张图表（个股环形 + 行业柱状）](feedback_xray_no_industry.md) — Top10 / Top5 行业 / 跨基金重仓三列表，右列搭配完整行业分布柱状图与穿透后个股占比环形图；行业均走 Panda AI Quant 真实接口，查不到明确画"未识别"。
- [金融数据源双引擎（Panda AI Quant + 同花顺）](project_quote_backend.md) — 涨跌 / 股票名称 / 行业 / 基金重仓全部走本地 Python FastAPI + cpolar HTTPS 隧道，不走 Superun 云端。
- [Landing 页版式——五层海报结构 + 双雷达 + 品牌墙](project_landing_layout.md) — Hero / 双雷达 / 六件武器 / STACK 三张静态技术卡（位图 logo 走 CDN 常量）/ OCR 白底品牌墙 marquee（轮播 `att-1..8.svg`，不处理对应哪家银行）。
- [中文排版与 mono 小字三条约束](feedback_dialog_typography.md) — 中文标题禁 font-mono + 大 tracking；Dialog 内全宽深色按钮 h-11 rounded-xl；mono eyebrow 只放英文代号、不重述中文标题。

>>>>>>> remote