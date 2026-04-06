"""
api_server.py
─────────────────────────────────────────────────────────────────────────────
Lightweight local sync server.  Receives a POST from the dashboard and runs
the Racional Playwright scraper, then upserts the holdings into Supabase.

Start it with:
    python api_server.py                 # default port 8787
    python api_server.py --port 8787

The dashboard calls  POST http://localhost:8787/sync-racional
with header  X-Sync-Key: <SYNC_KEY from .env>

Dependencies (add to your venv if missing):
    pip install fastapi uvicorn python-dotenv supabase
"""

import argparse
import os
import sys
from datetime import datetime, timezone

# Resolve paths relative to this file
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

try:
    from fastapi import FastAPI, HTTPException, Header
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
except ImportError:
    raise SystemExit(
        "FastAPI / uvicorn not installed.\n"
        "Run: pip install fastapi uvicorn"
    )

try:
    from supabase import create_client
except ImportError:
    raise SystemExit(
        "supabase-py not installed.\n"
        "Run: pip install supabase"
    )

from etl.racional_scraper import run_scrape

# ── Config ────────────────────────────────────────────────────────────────────
SYNC_KEY                 = os.environ.get("SYNC_KEY", "dev-sync-key-change-me")
SUPABASE_URL             = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print(
        "⚠️  SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY not set in .env\n"
        "   Portfolio upsert will fail until these are set."
    )

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Stocks Analyzer — Racional Sync API", version="1.0.0")

# Allow calls from the locally-running Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────
class SyncRequest(BaseModel):
    user_id: str
    # Optional credentials — if provided they override RACIONAL_EMAIL/PASSWORD in .env
    email: str | None = None
    password: str | None = None
    # If True, delete holdings no longer in Racional; if False (default), mark with sold_at
    replace_sold: bool = False


class SyncResponse(BaseModel):
    synced: int
    holdings: list[dict]


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


# ── Main sync endpoint ────────────────────────────────────────────────────────
@app.post("/sync-racional", response_model=SyncResponse)
def sync_racional(body: SyncRequest, x_sync_key: str = Header(...)):
    """
    1. Validates the shared secret (X-Sync-Key header).
    2. Runs the Playwright scraper — reads RACIONAL_EMAIL/PASSWORD from .env.
    3. Upserts scraped holdings into Supabase portfolio_assets for the given user.
    4. Returns the list of synced holdings.
    """
    # ── Auth ──────────────────────────────────────────────────────────────────
    if x_sync_key != SYNC_KEY:
        raise HTTPException(status_code=401, detail="Invalid sync key")

    # ── Scrape ────────────────────────────────────────────────────────────────
    result = run_scrape(
        email=body.email or None,
        password=body.password or None,
    )
    if not result["success"]:
        raise HTTPException(status_code=502, detail=result["error"])

    holdings = result["holdings"]

    # ── Upsert into Supabase ──────────────────────────────────────────────────
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured in .env"
        )

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Find or create portfolio for this user
    port_res = (
        supabase.table("portfolios")
        .select("id")
        .eq("user_id", body.user_id)
        .limit(1)
        .execute()
    )
    if port_res.data:
        portfolio_id = port_res.data[0]["id"]
    else:
        new_port = (
            supabase.table("portfolios")
            .insert({"user_id": body.user_id, "name": "My Portfolio"})
            .execute()
        )
        portfolio_id = new_port.data[0]["id"]

    # Upsert each holding — also clears sold_at for any re-bought positions
    scraped_symbols  = {h["symbol"].upper() for h in holdings}
    # Use Phase-1 ticker list as the authority for "gone" — not just scraped_symbols.
    # Symbols that failed Phase 2 (click glitch) are in all_tickers but not scraped.
    all_tickers_seen = {t.upper() for t in result.get("all_tickers", scraped_symbols)}
    for h in holdings:
        supabase.table("portfolio_assets").upsert(
            {
                "portfolio_id": portfolio_id,
                "symbol":       h["symbol"].upper(),
                "shares":       h["shares"],
                "avg_cost":     h.get("avg_cost"),
                "sold_at":      None,  # clear if previously marked sold
            },
            on_conflict="portfolio_id,symbol",
        ).execute()

    # ── Handle holdings no longer in Racional ────────────────────────────────
    existing_res = (
        supabase.table("portfolio_assets")
        .select("symbol")
        .eq("portfolio_id", portfolio_id)
        .is_("sold_at", "null")  # only consider currently-active rows
        .execute()
    )
    existing_symbols = {row["symbol"].upper() for row in (existing_res.data or [])}
    gone_symbols = list(existing_symbols - all_tickers_seen)

    if gone_symbols:
        if body.replace_sold:
            # Hard delete
            supabase.table("portfolio_assets") \
                .delete() \
                .eq("portfolio_id", portfolio_id) \
                .in_("symbol", gone_symbols) \
                .execute()
            print(f"🗑️  Deleted {len(gone_symbols)} sold holdings: {gone_symbols}")
        else:
            # Soft mark
            now_iso = datetime.now(timezone.utc).isoformat()
            supabase.table("portfolio_assets") \
                .update({"sold_at": now_iso}) \
                .eq("portfolio_id", portfolio_id) \
                .in_("symbol", gone_symbols) \
                .execute()
            print(f"🟡 Marked {len(gone_symbols)} holdings as sold: {gone_symbols}")

    print(f"✅ Synced {len(holdings)} holdings for user {body.user_id[:8]}…")
    return SyncResponse(synced=len(holdings), holdings=holdings)


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Racional sync API server")
    parser.add_argument("--port", type=int, default=8787, help="Port to listen on (default: 8787)")
    args = parser.parse_args()

    print(f"🚀 Racional sync server starting on http://localhost:{args.port}")
    print(f"   SYNC_KEY     : {'✅ set' if SYNC_KEY != 'dev-sync-key-change-me' else '⚠️  using default — change SYNC_KEY in .env'}")
    print(f"   SUPABASE_URL : {'✅ set' if SUPABASE_URL else '❌ not set'}")
    print(f"   RACIONAL_EMAIL: {'✅ set' if os.environ.get('RACIONAL_EMAIL') else '❌ not set'}")

    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="info")
