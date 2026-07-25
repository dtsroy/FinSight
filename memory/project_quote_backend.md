---
name: 金融数据源双引擎（Panda AI Quant + 同花顺）走本地 Python + cpolar
description: 涨跌、股票名称、行业、基金重仓这些行情数据全部走自建本地 Python FastAPI 后端，双数据源分别是 Panda AI Quant（A 股）和同花顺（基金），通过 cpolar HTTPS 隧道对云端前端提供服务
type: project
---

# 金融数据源双引擎（Panda AI Quant + 同花顺）走本地 Python + cpolar

FinSight 的所有实盘行情不走 Superun 云端，而是由用户自建的本地 Python 后端 `backend/` 桥接两家真实数据源，通过 **cpolar 内网穿透隧道**以 HTTPS 暴露给云端前端。

## 数据源分工

| 能力 | 数据源 | 后端接口 | 前端调用 |
|---|---|---|---|
| A 股当日涨跌 % | Panda AI Quant (`get_stock_daily`) | `GET /get_stock_diff?code=<ticker>` | `fetchChangePct("stock", code)` in `quoteService.ts` |
| 股票中文名称 | Panda AI Quant (`get_stock_detail.name`) | `GET /get_name_from_code?code=<ticker>` | `fetchStockNamesByCodes` in `stockNameService.ts` |
| 股票行业分类 | Panda AI Quant (`get_stock_detail.sector_code_name`) | `GET /get_industry_from_code?code=<ticker>` | `fetchStockIndustriesByCodes` in `stockIndustryService.ts` |
| 基金当日涨跌 % | 同花顺 `fund.10jqka.com.cn/data/client/myfund/<code>/` | `GET /get_fund_diff?code=<code>` | `fetchChangePct("fund", code)` |
| 基金前 10 大重仓 | 同花顺 `fund.10jqka.com.cn/web/fund/stockAndBond/<code>/` | `GET /get_fund_zc?code=<code>` | `fetchFundTopHoldings(code)` — X 光穿透优先用这个，回退到静态 `fund_holdings` 底稿 |

A 股票代码由 `_normalize_symbol` 自动补交易所后缀（6→SH，0/3→SZ，4/8/9→BJ），前端只需要给裸代码。

Panda AI Quant 需要 `panda_data.init_token(username, password)`；账号/密码由用户在 `backend/` 目录下 `auth.local` / `key.local` 两个本地文件里提供（不入库、不推到远端）。同花顺接口需要在请求头带 `hexin-v` 反爬 token（写在代码里，能用即可）。

## cpolar 隧道 + Mixed Content 自检

- 云端前端是 HTTPS，本地后端是 HTTP，因此必须通过 cpolar HTTPS 隧道暴露：`QUOTE_API_BASE = "https://5f2500d4.r7.cpolar.top"`（隧道每次重启会变，需要同步更新 `src/services/quoteService.ts` 顶部常量，或用 `VITE_QUOTE_API_URL` 环境变量覆盖）。
- `quoteService.ts` 里 `fetchChangePct` 和 `fetchFundTopHoldings` 都做了 Mixed Content 自检：页面 HTTPS + URL http:// 时直接 error 打出提示、返回 null，避免浏览器静默拦截后调试无门。
- 后端 CORS 用正则 `https://.*\.(cpolar\.top|superun\.yun)` 统配所有 cpolar 隧道域 + superun 预览域，不必每次改配置。

## X 光穿透与行情后端的协作

- 前端 `useRunXRay` 在调 Edge Function 之前，会先把账本里的基金按 `fund_code` 逐只调 `/get_fund_zc` 拿实时重仓，装成 `{ [fund_code]: [{stock_code, weight}, ...] }` 作为 `live_holdings` 传给 `compute-xray-report`。
- Edge Function 优先用 `live_holdings`，只有没拿到的基金才回退到静态 `fund_holdings` 底稿。两处都没有 → 进 `unmatched_funds`。
- 披露不足（`disclosedWeight < 100%`）的残值也进 `unmatched_funds` 带 reason=`披露不足（仅披露 X%）`，X 光页面头部会展示"另有 ¥N 未穿透"。

## Why：为什么不走 Superun 云端

- Panda AI Quant 是收费/授权账号，凭证只有用户本地才有；同花顺爬虫需要 IP 稳定的国内出口，云端 Edge Function 出口 IP 不可控且境外，都不合适。
- 用本地 Python + cpolar 的组合可以：凭证不出本机、IP 稳定、易于运维（Python 数据科学生态成熟）；对前端来说仍然是 HTTPS API，用户无感。

## How to apply

- 涉及任何"行情 / 名称 / 行业 / 基金披露"的新功能，加到 `backend/quote_api.py` 里新写一个 `get_xxx` 函数 + `backend/main.py` 里挂 route；前端在 `src/services/` 建对应 service（复用 `QUOTE_API_BASE`）+ `src/hooks/` 里写 `useQuery` hook。**不要**给 Superun Edge Function 加行情能力。
- cpolar 隧道地址变化时，只需要改 `src/services/quoteService.ts` 顶部 `QUOTE_API_BASE`，或在 `.env.local` 里设 `VITE_QUOTE_API_URL` 覆盖。
- 后端不可达是"预期内的降级情形"—— 前端 service 全部返回 null / 空对象、组件跳过展示，不弹错、不阻塞主流程。这是共同约定，不要在新功能里加 throw。
- Panda AI Quant 与同花顺都不承诺 SLA，任何依赖它们的 UI 都要有"数据缺失"分支（例如 X 光的"未识别行业金额"、Dashboard 涨跌卡片的"未拿到行情就不显示"）。
