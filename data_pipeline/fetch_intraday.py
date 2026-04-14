"""
fetch_intraday.py — Fetches current-day OHLCV for all active assets and upserts
into prices_daily. Designed to run during market hours (Mon–Fri 13:30–20:00 UTC).
"""

import math
import datetime as dt
import numpy as np
import yfinance as yf
from utils import get_connection


TODAY = dt.date.today()


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


def main():
    symbols, mapping = get_symbols_and_mapping()
    yf_symbols = [mapping.get(s, s) for s in symbols]
    sym_map_inv = {mapping.get(s, s): s for s in symbols}

    # Fetch today's 1-day bar for all symbols in one call
    tickers = yf.Tickers(" ".join(yf_symbols))
    rows = []
    for yf_sym in yf_symbols:
        canonical = sym_map_inv.get(yf_sym, yf_sym)
        try:
            hist = tickers.tickers[yf_sym].history(period="1d", interval="1d")
            if hist.empty:
                print(f"  ⚠  {canonical}: no data")
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
            print(f"  ✅ {canonical}: close={row['Close']:.4f}")
        except Exception as exc:
            print(f"  ❌ {canonical}: {exc}")

    upserted = upsert_prices(rows)
    print(f"\nUpserted {upserted} rows for {TODAY}")


if __name__ == "__main__":
    main()
