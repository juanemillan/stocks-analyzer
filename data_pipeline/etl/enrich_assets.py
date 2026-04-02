"""
etl/enrich_assets.py
────────────────────
Fetches metadata for every active asset via yfinance and upserts into
the assets table (description, sector, industry, website, country, logo_url).

Usage (from data_pipeline/):
    python main.py --enrich
    python main.py --enrich --symbol AAPL      # single symbol
    python main.py --enrich --missing-only      # only symbols with no description yet
"""

import time
import argparse
from utils import get_connection

try:
    import yfinance as yf
except ImportError:
    raise SystemExit("yfinance not installed. Run: pip install yfinance")


# Fields we pull from yf.Ticker.info
YF_FIELD_MAP = {
    "longBusinessSummary": "description",
    "sector":              "sector",
    "industry":            "industry",
    "website":             "website",
    "country":             "country",
    "logo_url":            "logo_url",
}

SLEEP_BETWEEN = 0.4   # seconds between requests (rate-limit friendly)
BATCH_SIZE    = 50    # print progress every N symbols


def _fetch_info(symbol: str) -> dict:
    """Return a dict with mapped field values (empty strings become None)."""
    try:
        info = yf.Ticker(symbol).info
    except Exception:
        return {}

    result = {}
    for yf_key, col_name in YF_FIELD_MAP.items():
        val = info.get(yf_key) or None
        if isinstance(val, str) and val.strip() == "":
            val = None
        result[col_name] = val
    return result


def enrich_assets(symbol_filter: str | None = None, missing_only: bool = False):
    conn = get_connection()
    cur  = conn.cursor()

    if symbol_filter:
        cur.execute("SELECT symbol FROM assets WHERE symbol = %s;", (symbol_filter.upper(),))
    elif missing_only:
        cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE AND description IS NULL ORDER BY symbol;")
    else:
        cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE ORDER BY symbol;")

    symbols = [r[0] for r in cur.fetchall()]
    total   = len(symbols)
    print(f"🔍 Enriching {total} asset(s)…")

    updated = 0
    skipped = 0

    for i, symbol in enumerate(symbols, 1):
        data = _fetch_info(symbol)

        if not data:
            skipped += 1
        else:
            cur.execute("""
                UPDATE assets SET
                    description  = COALESCE(%s, description),
                    sector       = COALESCE(%s, sector),
                    industry     = COALESCE(%s, industry),
                    website      = COALESCE(%s, website),
                    country      = COALESCE(%s, country),
                    logo_url     = COALESCE(%s, logo_url),
                    enriched_at  = now()
                WHERE symbol = %s;
            """, (
                data.get("description"),
                data.get("sector"),
                data.get("industry"),
                data.get("website"),
                data.get("country"),
                data.get("logo_url"),
                symbol,
            ))
            conn.commit()
            updated += 1

        if i % BATCH_SIZE == 0 or i == total:
            pct = i / total * 100
            print(f"  [{i:>4}/{total}] {pct:.1f}%  updated={updated}  skipped={skipped}")

        time.sleep(SLEEP_BETWEEN)

    cur.close()
    conn.close()
    print(f"\n✅ Done. {updated} updated, {skipped} skipped out of {total} symbols.")
