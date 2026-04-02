"""
etl/enrich_from_racional.py
────────────────────────────
Scrapes company descriptions from Racional's asset detail pages using a
headless browser (Playwright + Chromium) for assets where yfinance returned
no description.

Why Playwright: Racional is an Angular SPA — content is loaded via Firebase
WebSocket after JS runs, so plain HTTP requests get empty skeletons.

URL pattern: https://app.racional.cl/asset-details/{symbol}

Usage (from data_pipeline/):
    python main.py --enrich-racional
    python main.py --enrich-racional --symbol AAPL
    python main.py --enrich-racional --missing-only   # only null descriptions
"""

import time
from utils import get_connection

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    raise SystemExit("playwright not installed. Run: pip install playwright && python -m playwright install chromium")

BASE_URL       = "https://app.racional.cl/asset-details/{symbol}"
WAIT_TIMEOUT   = 20_000   # ms — wait for skeleton → real text
NAV_TIMEOUT    = 30_000   # ms — page.goto timeout
BATCH_SIZE     = 20       # print progress every N symbols
BETWEEN_PAGES  = 0.5      # seconds between navigations (polite crawl)


def _extract_description(page, symbol: str) -> str | None:
    """Navigate to asset page, wait for description text, return it."""
    url = BASE_URL.format(symbol=symbol)
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        # Wait until at least one p.asset-description has real text (skeletons gone)
        page.wait_for_function(
            """() => {
                const el = Array.from(document.querySelectorAll('p.asset-description'))
                               .find(e => e.textContent.trim().length > 10);
                return !!el;
            }""",
            timeout=WAIT_TIMEOUT,
        )
        result = page.evaluate("""() => {
            const el = Array.from(document.querySelectorAll('p.asset-description'))
                            .find(e => e.textContent.trim().length > 10);
            return el ? el.textContent.trim() : null;
        }""")
        return result or None
    except PWTimeout:
        return None
    except Exception:
        return None


def enrich_from_racional(symbol_filter: str | None = None, missing_only: bool = False):
    conn = get_connection()
    cur  = conn.cursor()

    if symbol_filter:
        cur.execute(
            "SELECT symbol FROM assets WHERE symbol = %s;",
            (symbol_filter.upper(),),
        )
    elif missing_only:
        cur.execute(
            "SELECT symbol FROM assets WHERE is_active = TRUE AND description IS NULL ORDER BY symbol;"
        )
    else:
        cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE ORDER BY symbol;")

    symbols = [r[0] for r in cur.fetchall()]
    total   = len(symbols)
    print(f"🌐 Racional scrape: {total} asset(s)…")

    updated = 0
    skipped = 0

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Reuse a single page across requests — avoids context startup cost
        pw_page = browser.new_page()

        for i, symbol in enumerate(symbols, 1):
            desc = _extract_description(pw_page, symbol)

            if desc:
                cur.execute(
                    """UPDATE assets
                       SET description = COALESCE(%s, description),
                           enriched_at = now()
                       WHERE symbol = %s;""",
                    (desc, symbol),
                )
                conn.commit()
                updated += 1
            else:
                skipped += 1

            if i % BATCH_SIZE == 0 or i == total:
                pct = i / total * 100
                print(f"  [{i:>4}/{total}] {pct:.1f}%  updated={updated}  skipped={skipped}")

            time.sleep(BETWEEN_PAGES)

        browser.close()

    cur.close()
    conn.close()
    print(f"\n✅ Done. {updated} updated, {skipped} skipped out of {total} symbols.")
