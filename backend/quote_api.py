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


def get_stock_diff(code: str) -> float:
    """
    TODO: replace with a real stock-quote API call.

    Example providers:
        - AkShare:   ak.stock_zh_a_spot_em() (A-shares)
        - Tushare:   pro.daily(ts_code=code, ...)
        - XueQiu /  东方财富 unofficial REST

    Args:
        code: stock ticker, e.g. "600519" or "AAPL"

    Returns:
        Day change percentage as a float, e.g. 2.35 means +2.35 %.
    """
    # ── STUB: returns a fixed constant until you plug in a real API ──
    return 1.23


def get_fund_diff(code: str) -> float:
    """
    TODO: replace with a real fund-NAV API call.

    Example providers:
        - AkShare:   ak.fund_open_fund_daily_em(fund=code)
        - 天天基金 / 蛋卷 unofficial REST

    Args:
        code: fund code, e.g. "110022"

    Returns:
        Day change percentage as a float, e.g. -0.45 means -0.45 %.
    """
    # ── STUB: returns a fixed constant until you plug in a real API ──
    return -0.45
