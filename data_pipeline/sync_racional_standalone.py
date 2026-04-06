"""
sync_racional_standalone.py
────────────────────────────────────────────────────────────────────────────
Run by GitHub Actions (cron schedule or workflow_dispatch) to scrape the
Racional portfolio and upsert holdings into Supabase.

Usage:
    python sync_racional_standalone.py
    python sync_racional_standalone.py --user-id <UUID>
    python sync_racional_standalone.py --user-id <UUID> --replace-sold

Environment variables (set as GitHub Secrets in CI, or in .env locally):
    RACIONAL_FIREBASE_API_KEY
    RACIONAL_EMAIL
    RACIONAL_PASSWORD
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    RACIONAL_USER_ID   — used when --user-id is not provided (for cron runs)
"""

import argparse
import os
import sys
from datetime import datetime, timezone

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

try:
    from supabase import create_client
except ImportError:
    raise SystemExit("supabase-py not installed.  Run: pip install supabase")

from etl.racional_scraper import run_scrape

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL              = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def main(user_id: str, replace_sold: bool = False) -> None:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise SystemExit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables."
        )

    print(f"[{datetime.now(timezone.utc).isoformat()}] Starting Racional sync for user {user_id[:8]}…")

    # ── Scrape ────────────────────────────────────────────────────────────────
    result = run_scrape()
    if not result["success"]:
        raise SystemExit(f"Scrape failed: {result['error']}")

    holdings    = result["holdings"]
    # all_tickers = every ticker Phase 1 found in the DOM (reliable).
    # scraped_symbols ⊆ all_tickers. Missing from scraped = click glitch, NOT a sale.
    # Only mark sold if the ticker wasn't even listed in Phase 1.
    all_tickers_seen = {t.upper() for t in result.get("all_tickers", [h["symbol"] for h in holdings])}
    print(f"✅ Scraped {len(holdings)}/{len(all_tickers_seen)} holdings: {[h['symbol'] for h in holdings]}")

    # ── Upsert into Supabase ──────────────────────────────────────────────────
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    port_res = (
        supabase.table("portfolios")
        .select("id")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if port_res.data:
        portfolio_id = port_res.data[0]["id"]
    else:
        new_port = (
            supabase.table("portfolios")
            .insert({"user_id": user_id, "name": "My Portfolio"})
            .execute()
        )
        portfolio_id = new_port.data[0]["id"]

    scraped_symbols = {h["symbol"].upper() for h in holdings}
    for h in holdings:  # noqa: E501
        supabase.table("portfolio_assets").upsert(
            {
                "portfolio_id": portfolio_id,
                "symbol":       h["symbol"].upper(),
                "shares":       h["shares"],
                "avg_cost":     h.get("avg_cost"),
                "sold_at":      None,
            },
            on_conflict="portfolio_id,symbol",
        ).execute()

    # Handle holdings no longer in Racional
    existing_res = (
        supabase.table("portfolio_assets")
        .select("symbol")
        .eq("portfolio_id", portfolio_id)
        .is_("sold_at", "null")
        .execute()
    )
    existing_symbols = {row["symbol"].upper() for row in (existing_res.data or [])}
    # Only consider truly gone: was in Supabase AND wasn't even seen in Phase 1.
    # Symbols seen in Phase 1 but not scraped = Angular click glitch — leave untouched.
    gone_symbols = list(existing_symbols - all_tickers_seen)

    if gone_symbols:
        now_iso = datetime.now(timezone.utc).isoformat()
        if replace_sold:
            supabase.table("portfolio_assets") \
                .delete() \
                .eq("portfolio_id", portfolio_id) \
                .in_("symbol", gone_symbols) \
                .execute()
            print(f"🗑️  Deleted {len(gone_symbols)} gone holdings: {gone_symbols}")
        else:
            supabase.table("portfolio_assets") \
                .update({"sold_at": now_iso}) \
                .eq("portfolio_id", portfolio_id) \
                .in_("symbol", gone_symbols) \
                .execute()
            print(f"🟡 Marked {len(gone_symbols)} holdings as sold: {gone_symbols}")

    print(f"✅ Upserted {len(holdings)} holdings to Supabase (portfolio {portfolio_id[:8]}…)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Scrape Racional portfolio and upsert into Supabase."
    )
    parser.add_argument(
        "--user-id",
        default=os.environ.get("RACIONAL_USER_ID", ""),
        help="Supabase user UUID (or set RACIONAL_USER_ID env var)",
    )
    parser.add_argument(
        "--replace-sold",
        action="store_true",
        help="Hard-delete holdings gone from Racional instead of soft-marking them",
    )
    args = parser.parse_args()

    if not args.user_id:
        raise SystemExit(
            "User ID required: pass --user-id <UUID> or set RACIONAL_USER_ID env var.\n"
            "Find your UUID in Supabase dashboard → Authentication → Users."
        )

    main(args.user_id, args.replace_sold)
