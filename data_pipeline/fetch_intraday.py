"""
fetch_intraday.py — Fetches current-day OHLCV for all active assets and upserts
into prices_daily. Designed to run during market hours (Mon–Fri 13:30–20:00 UTC).
"""

import argparse
import math
import datetime as dt
import json
import os
import time
from pathlib import Path

import numpy as np
import yfinance as yf

from utils import get_connection


TODAY = dt.date.today()
PROGRESS_FILE = Path(__file__).resolve().parent / ".intraday_progress.json"
BATCH_SIZE = int(os.getenv("INTRADAY_BATCH_SIZE", "200"))
SLEEP_BETWEEN_BATCHES = int(os.getenv("INTRADAY_SLEEP_S", "2"))


def get_symbols_and_mapping():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE;")
    symbols = [r[0].strip().upper() for r in cur.fetchall()]
    if "SPY" not in symbols:
        symbols.append("SPY")
    try:
        cur.execute("SELECT symbol, yf_symbol FROM symbol_map;")
        mapping = {s.strip().upper(): yf_sym.strip() for s, yf_sym in cur.fetchall()}
    except Exception:
        mapping = {}
    cur.close()
    conn.close()
    return symbols, mapping


def get_top_symbols(n: int):
    """Attempt to fetch top-n symbols by avg_volume if column exists; otherwise return []"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        # Check for column existence
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='assets' and column_name='avg_volume'")
        if cur.fetchone():
            cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE ORDER BY avg_volume DESC NULLS LAST LIMIT %s", (n,))
            rows = [r[0].strip().upper() for r in cur.fetchall()]
            cur.close()
            conn.close()
            return rows
        cur.close()
        conn.close()
    except Exception:
        pass
    return []


def json_safe(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if isinstance(v, (float, np.floating)):
            vv = float(v)
            out[k] = vv if math.isfinite(vv) else None
        else:
            out[k] = v
    return out


def upsert_prices(rows: list[dict]) -> int:
    if not rows:
        return 0
    conn = get_connection()
    cur = conn.cursor()
    sql = """
        INSERT INTO prices_daily (symbol, date, open, high, low, close, volume)
        VALUES (%(symbol)s, %(date)s, %(open)s, %(high)s, %(low)s, %(close)s, %(volume)s)
        ON CONFLICT (symbol, date) DO UPDATE SET
            open   = EXCLUDED.open,
            high   = EXCLUDED.high,
            low    = EXCLUDED.low,
            close  = EXCLUDED.close,
            volume = EXCLUDED.volume
    """
    cur.executemany(sql, rows)
    count = cur.rowcount
    cur.close()
    conn.close()
    return count


def main(argv=None):
    parser = argparse.ArgumentParser(description="Fetch intraday prices with batching and resume")
    parser.add_argument("--reset", action="store_true", help="Reset progress file and start from scratch")
    parser.add_argument("--dry-run", action="store_true", help="Run without upserting to DB")
    parser.add_argument("--priority-top", type=int, default=0, help="If >0, attempt to prioritize top N symbols by avg_volume")
    args = parser.parse_args(argv)

    symbols, mapping = get_symbols_and_mapping()
    if args.priority_top and args.priority_top > 0:
        top = get_top_symbols(args.priority_top)
        if top:
            # Move prioritized symbols to front while preserving order for others
            top_set = set(top)
            others = [s for s in symbols if s not in top_set]
            symbols = top + others
            print(f"Prioritized top {len(top)} symbols")
    yf_symbols = [mapping.get(s, s) for s in symbols]
    sym_map_inv = {mapping.get(s, s): s for s in symbols}
    # Handle reset
    if args.reset and PROGRESS_FILE.exists():
        try:
            PROGRESS_FILE.unlink()
            print("Progress file removed (--reset)")
        except Exception as e:
            print(f"Warning: failed to remove progress file: {e}")

    # Load progress if available to support resume
    completed = set()
    if PROGRESS_FILE.exists():
        try:
            with open(PROGRESS_FILE, "r", encoding="utf8") as f:
                data = json.load(f)
                completed = set(data.get("completed", []))
        except Exception:
            completed = set()

    # Prepare batches of yf_symbols
    def chunks(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i : i + n]

    all_rows = []
    total = len(yf_symbols)
    processed = 0
    for batch in chunks(yf_symbols, BATCH_SIZE):
        # filter already completed symbols in this batch
        batch_to_fetch = [s for s in batch if sym_map_inv.get(s, s) not in completed]
        if not batch_to_fetch:
            processed += len(batch)
            print(f"Skipping batch ({processed}/{total}) — already completed")
            continue

        print(f"Processing batch ({processed + 1}-{min(processed + len(batch), total)}/{total}) size={len(batch_to_fetch)}")

        tickers = yf.Tickers(" ".join(batch_to_fetch))
        rows = []
        for yf_sym in batch_to_fetch:
            canonical = sym_map_inv.get(yf_sym, yf_sym)
            try:
                hist = tickers.tickers[yf_sym].history(period="1d", interval="1d")
                if hist.empty:
                    print(f"  ⚠  {canonical}: no data")
                    completed.add(canonical)
                    continue
                row = hist.iloc[-1]
                record = json_safe({
                    "symbol": canonical,
                    "date": TODAY.isoformat(),
                    "open": row["Open"],
                    "high": row["High"],
                    "low": row["Low"],
                    "close": row["Close"],
                    "volume": int(row["Volume"]) if not math.isnan(row["Volume"]) else None,
                })
                rows.append(record)
                completed.add(canonical)
                print(f"  ✅ {canonical}: close={row['Close']:.4f}")
            except Exception as exc:
                print(f"  ❌ {canonical}: {exc}")

        # Upsert this batch (unless dry-run)
        upserted = 0
        if not args.dry_run:
            upserted = upsert_prices(rows)
        all_rows.extend(rows)
        print(f"Upserted {upserted} rows for this batch")

        # Persist progress after each batch
        try:
            with open(PROGRESS_FILE, "w", encoding="utf8") as f:
                json.dump({"completed": sorted(list(completed)), "updated_at": dt.datetime.utcnow().isoformat()}, f)
        except Exception as exc:
            print(f"Warning: failed to write progress file: {exc}")

        processed += len(batch)
        # avoid hammering API
        time.sleep(SLEEP_BETWEEN_BATCHES)

    print(f"\nFinished. Total upserted rows: {len(all_rows)} for {TODAY}")


if __name__ == "__main__":
    main()
