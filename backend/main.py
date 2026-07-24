"""
FinSight Quote Backend — local HTTP service (FastAPI + Uvicorn).

Endpoints
---------
GET /get_stock_diff?code=<ticker>
    Returns the day change % for a stock.

GET /get_fund_diff?code=<fund_code>
    Returns the day change % for a fund.

GET /get_fund_zc?code=<fund_code>
    Returns the fund's latest disclosed top stock holdings (重仓股).

Response shape (diff endpoints)
---------------------------------
{
    "code":       "600519",          # echoes the requested code
    "change_pct": 2.35               # float, percent; +2.35 means +2.35 %
}

Response shape (/get_fund_zc)
---------------------------------
{
    "code":     "005827",                          # echoes the requested code
    "holdings": [{"code": "600519", "ccRate": 9.5}]  # ccRate = 占净值比例 %
}
Funds with no disclosed stock holdings (e.g. money-market funds) return
an empty "holdings" list — callers should treat that as "not penetrable".

Error shape (HTTP 400 / 502)
-----------------------------
{
    "detail": "<human-readable message>"
}

Run locally
-----------
    uvicorn main:app --host 127.0.0.1 --port 8787 --reload
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from quote_api import get_fund_diff, get_fund_zc, get_stock_diff

app = FastAPI(title="FinSight Quote API", version="0.1.0")

# ── CORS: allow the Vite dev-server (local), the cpolar tunnel, and the
#    Superun preview domains (their subdomain is generated per deploy, so we
#    match the whole superun.yun family with a regex instead of hard-coding). ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",              # Vite default dev port
        "http://localhost:4173",              # Vite preview port
        "http://localhost:3000",              # alternative dev port
    ],
    # cpolar 隧道域名每次重启都会变（如 https://12471763.r7.cpolar.top），
    # 前端预览域名也每次部署都会变（如 https://id--xxx.superun.yun），
    # 用正则统配，不再硬编码。
    allow_origin_regex=r"https://.*\.(cpolar\.top|superun\.yun)",
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/get_stock_diff")
def route_stock_diff(
    code: str = Query(..., description="Stock ticker, e.g. '600519' or 'AAPL'"),
):
    """Return the day change percentage for a stock."""
    if not code.strip():
        raise HTTPException(status_code=400, detail="'code' must not be empty.")
    try:
        pct = get_stock_diff(code.strip())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc
    return {"code": code.strip(), "change_pct": round(float(pct), 4)}


@app.get("/get_fund_diff")
def route_fund_diff(
    code: str = Query(..., description="Fund code, e.g. '110022'"),
):
    """Return the day change percentage for a fund."""
    if not code.strip():
        raise HTTPException(status_code=400, detail="'code' must not be empty.")
    try:
        pct = get_fund_diff(code.strip())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc
    return {"code": code.strip(), "change_pct": round(float(pct), 4)}


@app.get("/get_fund_zc")
def route_fund_zc(
    code: str = Query(..., description="Fund code, e.g. '005827'"),
):
    """Return the fund's latest disclosed top stock holdings (重仓股).

    ``holdings`` is a list of {"code", "ccRate"} items, where ccRate is the
    position weight in percent of NAV. Funds without disclosed stock holdings
    (e.g. money-market funds) legitimately return an empty list — it is up to
    the caller to treat that as "cannot be looked through" and skip the fund.
    """
    if not code.strip():
        raise HTTPException(status_code=400, detail="'code' must not be empty.")
    try:
        holdings = get_fund_zc(code.strip())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc
    return {"code": code.strip(), "holdings": holdings}


# ──────────────────────────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}
