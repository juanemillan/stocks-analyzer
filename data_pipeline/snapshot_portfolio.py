#!/usr/bin/env python3
"""
snapshot_portfolio.py — Compute and persist a daily portfolio valuation snapshot.

Runs nightly after the ETL refreshes prices (called from portfolio-alerts.yml).

For every active holding with avg_cost:
  - Reads today's close price from CockroachDB (prices_daily)
  - Computes total_value = SUM(shares × close) and total_cost = SUM(shares × avg_cost)
  - Upserts one row per user into portfolio_snapshots in Supabase

Environment:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
"""

import os
import sys
import psycopg2
from datetime import date, datetime, timezone

os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]

try:
    from supabase import create_client
except ImportError:
    sys.exit("supabase-py not installed. Run: pip install supabase")


def db_latest_prices(conn, symbols: list) -> dict:
    if not symbols:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT ON (symbol) symbol, close
            FROM prices_daily
            WHERE symbol = ANY(%s)
            ORDER BY symbol, date DESC
            """,
            (symbols,),
        )
        return {row[0]: float(row[1]) for row in cur.fetchall()}


def main() -> None:
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Fetch all active holdings with avg_cost
    resp = (
        sb.from_("portfolio_assets")
        .select("symbol, shares, avg_cost, portfolio_id, portfolios(user_id)")
        .filter("sold_at", "is", "null")
        .filter("avg_cost", "not.is", "null")
        .execute()
    )
    holdings = resp.data or []
    if not holdings:
        print("No active holdings with avg_cost — nothing to snapshot.")
        return

    print(f"Snapshotting {len(holdings)} holding(s)…")

    symbols = list({h["symbol"] for h in holdings})

    # 2. Get latest close prices from CockroachDB
    db_url = DATABASE_URL.replace("sslmode=no-verify", "sslmode=require")
    conn = psycopg2.connect(db_url)
    try:
        price_map = db_latest_prices(conn, symbols)
    finally:
        conn.close()

    print(f"Prices fetched for {len(price_map)}/{len(symbols)} symbol(s)")

    # 3. Aggregate per user
    from collections import defaultdict
    user_totals: dict = defaultdict(lambda: {"total_value": 0.0, "total_cost": 0.0})

    for h in holdings:
        user_id = h["portfolios"]["user_id"]
        symbol = h["symbol"]
        shares = float(h.get("shares") or 0)
        avg_cost = float(h.get("avg_cost") or 0)
        price = price_map.get(symbol)
        if price is None or shares <= 0:
            continue
        user_totals[user_id]["total_value"] += shares * price
        user_totals[user_id]["total_cost"] += shares * avg_cost

    if not user_totals:
        print("No valuations computed — check price availability.")
        return

    today = date.today().isoformat()
    rows = [
        {
            "user_id": uid,
            "date": today,
            "total_value": round(totals["total_value"], 2),
            "total_cost": round(totals["total_cost"], 2),
        }
        for uid, totals in user_totals.items()
    ]

    # 4. Upsert snapshots
    result = (
        sb.from_("portfolio_snapshots")
        .upsert(rows, on_conflict="user_id,date")
        .execute()
    )
    print(f"Upserted {len(rows)} snapshot(s) for date={today}")
    for r in rows:
        uid_short = r["user_id"][:8]
        print(f"  user={uid_short}  value=${r['total_value']:,.2f}  cost=${r['total_cost']:,.2f}")


if __name__ == "__main__":
    main()
