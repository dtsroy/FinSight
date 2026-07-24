"""
Quote API — core business logic layer.

Replace the two stub functions below with real data-source calls.
The rest of the codebase (main.py, quoteService.ts) never needs to change.

Return convention
-----------------
Both functions return a plain float representing the **day change percentage**,
where +1.23 means +1.23 % and -0.5 means -0.50 %.
Raise any exception on failure; main.py will convert it to HTTP 502.
"""
from typing import Dict, List
from datetime import datetime, timedelta

import panda_data
import json
from requests import get


with open("auth.local", "r") as f:
    auth = f.read().strip()

with open("key.local", "r") as f:
    pwd = f.read().strip()

panda_data.init_token(
    username=auth,
    password=pwd
)


def _normalize_symbol(code: str) -> str:
    """
    Turn a bare A-share ticker into panda_data's ``<code>.<EXCHANGE>`` form.

    If ``code`` already carries a suffix (e.g. "600519.SH") it is returned
    unchanged. Exchange is inferred from the leading digits:
        - 6*            → SH  (Shanghai main / STAR)
        - 0* / 3*       → SZ  (Shenzhen main / ChiNext)
        - 4* / 8* / 9*  → BJ  (Beijing)
    """
    code = code.strip().upper()
    if "." in code:
        return code
    if code.startswith("6"):
        return f"{code}.SH"
    if code.startswith(("0", "3")):
        return f"{code}.SZ"
    if code.startswith(("4", "8", "9")):
        return f"{code}.BJ"
    # Unknown prefix — hand it over untouched and let the upstream decide.
    return code


def get_stock_diff(code: str) -> float:
    """
    Return the latest trading-day change percentage for an A-share stock.

    Pulls daily bars via ``panda_data.get_stock_daily`` over a short trailing
    window, takes the most recent row, and computes the percent change from
    that day's ``pre_close`` to its ``close``.

    Args:
        code: stock ticker, e.g. "600519" or "600519.SH".

    Returns:
        Day change percentage as a float, e.g. 2.35 means +2.35 %.

    Raises:
        RuntimeError: if no daily data is available for the ticker.
    """
    symbol = _normalize_symbol(code)

    # Look back ~15 calendar days so we still catch the latest trading day
    # across weekends / holidays.
    today = datetime.now()
    start = today - timedelta(days=15)

    df = panda_data.get_stock_daily(
        symbol=[symbol],
        start_date=start.strftime("%Y%m%d"),
        end_date=today.strftime("%Y%m%d"),
    )

    if df is None or df.empty:
        print("panda API error: no daily data returned for", symbol)
        raise RuntimeError(f"No daily data returned for '{symbol}'.")

    # `date` is a YYYYMMDD string, so lexical sort == chronological sort.
    latest = df.sort_values("date").iloc[-1]
    close = float(latest["close"])
    pre_close = float(latest["pre_close"])

    if pre_close == 0:
        raise RuntimeError(f"Invalid pre_close (0) for '{symbol}'.")

    return (close - pre_close) / pre_close * 100.0

def get_fund_diff(code: str) -> float:
    """
    Return the latest trading-day change percentage for a fund.

    Pulls daily bars via ``panda_data.get_fund_daily`` over a short
    trailing window, takes the most recent row, and computes the
    percent change.
    
    Args:
        code: fund code, e.g. "510050"

    Returns:
        Day change percentage as a float, e.g. -0.45 means -0.45 %.

    Raises:
        RuntimeError: if no daily data is available for the ticker.
    """
    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
        "hexin-v": "Axq-l0EVJHYeyajaNi1NQm3La8s5S54tEM8SySSTxq14l7T1DNvuNeBfYtr3",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Microsoft Edge\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest"
    }
    html = get(f"https://fund.10jqka.com.cn/data/client/myfund/{code}/", headers=headers)
    html.encoding = html.apparent_encoding
    try:
        return float(json.loads(html.text)['data'][0]['rate'])
    except ValueError as e:
        # 空值，尝试获得万份收益计算
        return float(json.loads(html.text)['data'][0]['net']) / 1e4 * 1e2

def get_fund_zc(code: str) -> List[Dict[str, str|float]]:
    headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "hexin-v": "A9h8UTcfBtgVCSpcot1v3LNRqQ1vwTxLniUQzxLJJJPGrXazutEM2-414FNh",
        "sec-ch-ua": "\"Not;A=Brand\";v=\"8\", \"Chromium\";v=\"150\", \"Microsoft Edge\";v=\"150\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "x-requested-with": "XMLHttpRequest"
    }
    html = get(f"https://fund.10jqka.com.cn/web/fund/stockAndBond/{code}/", headers=headers)
    html.encoding = html.apparent_encoding
    data = json.loads(html.text)['data']['stock']
    ret = []
    for stk in data:
        if stk['zcType'] == 'stock':
            ret.append({"code": stk['zcCode'], 'ccRate': float(stk['ccRate'])})
    return ret
