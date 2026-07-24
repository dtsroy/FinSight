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
from datetime import datetime, timedelta

import panda_data

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
        raise RuntimeError(f"No daily data returned for '{symbol}'.")

    # `date` is a YYYYMMDD string, so lexical sort == chronological sort.
    latest = df.sort_values("date").iloc[-1]
    close = float(latest["close"])
    pre_close = float(latest["pre_close"])

    if pre_close == 0:
        raise RuntimeError(f"Invalid pre_close (0) for '{symbol}'.")

    return (close - pre_close) / pre_close * 100.0


def _normalize_fund_symbol(code: str) -> str:
    """
    Append the correct exchange suffix for a Chinese fund ticker.

    Exchange inference rules (by leading two digits):
        51 / 58 / 50 / 56 / 57   → SH  (Shanghai ETF / LOF)
        15 / 16 / 12 / 13        → SZ  (Shenzhen ETF / LOF)

    If the code already contains a dot it is returned unchanged.
    Bare codes that don't match any known prefix are passed through
    as-is and let panda_data raise if the ticker is invalid.
    """
    code = code.strip().upper()
    if "." in code:
        return code
    prefix = code[:2]
    if prefix in ("51", "58", "50", "56", "57"):
        return f"{code}.SH"
    if prefix in ("15", "16", "12", "13"):
        return f"{code}.SZ"
    # Unknown prefix (e.g. open-end fund bare code) — pass through.
    return code


def get_fund_diff(code: str) -> float:
    """
    Return the latest trading-day change percentage for a fund.

    Pulls daily bars via ``panda_data.get_fund_daily`` over a short
    trailing window, takes the most recent row, and computes the
    percent change.

    Priority for change calculation:
      1. ``(close - pre_close) / pre_close * 100``  if ``pre_close`` column
         is present and non-zero.
      2. ``(close_t - close_{t-1}) / close_{t-1} * 100``  using the two
         most recent rows as a fallback.

    Args:
        code: fund code, e.g. "510050" or "510050.SH".

    Returns:
        Day change percentage as a float, e.g. -0.45 means -0.45 %.

    Raises:
        RuntimeError: if no daily data is available for the ticker.
    """
    symbol = _normalize_fund_symbol(code)

    # Look back ~15 calendar days so we still catch the latest trading day
    # across weekends / holidays.
    today = datetime.now()
    start = today - timedelta(days=15)

    df = panda_data.get_fund_daily(
        symbol=symbol,
        start_date=start.strftime("%Y%m%d"),
        end_date=today.strftime("%Y%m%d"),
    )

    if df is None or df.empty:
        raise RuntimeError(f"No daily data returned for fund '{symbol}'.")

    df = df.sort_values("date")

    # ── Strategy 1: use pre_close column ──────────────────────────────────
    if "pre_close" in df.columns:
        latest = df.iloc[-1]
        close = float(latest["close"])
        pre_close = float(latest["pre_close"])
        if pre_close != 0:
            return (close - pre_close) / pre_close * 100.0

    # ── Strategy 2: derive from two consecutive rows ───────────────────────
    if len(df) < 2:
        raise RuntimeError(
            f"Insufficient data to compute change for fund '{symbol}' "
            "(need at least 2 trading days)."
        )
    prev_close = float(df.iloc[-2]["close"])
    curr_close = float(df.iloc[-1]["close"])
    if prev_close == 0:
        raise RuntimeError(f"Invalid previous close (0) for fund '{symbol}'.")
    return (curr_close - prev_close) / prev_close * 100.0
