import math
import datetime as dt
import numpy as np
import pandas as pd
import yfinance as yf
from utils import get_connection

TODAY = dt.date.today()

# ---------- Helpers ----------
def json_safe(d: dict) -> dict:
    out = {}
    for k, v in d.items():
        if isinstance(v, (float, np.floating)):
            vv = float(v)
            out[k] = vv if math.isfinite(vv) else None
        else:
            out[k] = v
    return out


def get_symbols_and_mapping():
    """Obtiene los símbolos base y el mapeo Yahoo."""
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


def get_last_dates():
    """Obtiene la última fecha cargada por símbolo."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT symbol, MAX(date) FROM prices_daily GROUP BY symbol;")
    result = {s: d for s, d in cur.fetchall() if d}
    cur.close()
    conn.close()
    return result


def upsert_prices(rows):
    """Inserta o actualiza precios en la tabla prices_daily."""
    if not rows:
        return 0
    conn = get_connection()
    cur = conn.cursor()
    args_str = ",".join(
        cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", (
            r["symbol"], r["date"], r["open"], r["high"],
            r["low"], r["close"], r["volume"]
        )).decode() for r in rows
    )
    cur.execute(f"""
        INSERT INTO prices_daily (symbol, date, open, high, low, close, volume)
        VALUES {args_str}
        ON CONFLICT (symbol, date)
        DO UPDATE SET
            open = EXCLUDED.open,
            high = EXCLUDED.high,
            low = EXCLUDED.low,
            close = EXCLUDED.close,
            volume = EXCLUDED.volume;
    """)
    conn.commit()
    cur.close()
    conn.close()
    return len(rows)


# ---------- Main ----------
def main():
    symbols, mapping = get_symbols_and_mapping()
    last_by_symbol = get_last_dates()

    updated = skipped = errors = 0

    for s in symbols:
        try:
            yf_sym = mapping.get(s, s)
            if s in last_by_symbol:
                start_date = last_by_symbol[s] + dt.timedelta(days=1)
                if start_date > TODAY:
                    skipped += 1
                    continue
                hist = yf.Ticker(yf_sym).history(
                    start=start_date,
                    end=TODAY + dt.timedelta(days=1),
                    interval="1d",
                    auto_adjust=True,
                )
            else:
                hist = yf.Ticker(yf_sym).history(period="1y", interval="1d", auto_adjust=True)

            if hist is None or hist.empty:
                skipped += 1
                continue

            # Normalizar DataFrame
            if "Date" not in hist.columns and isinstance(hist.index, pd.DatetimeIndex):
                hist = hist.reset_index()
            hist = hist.rename(columns=str.lower)
            if "date" not in hist.columns and isinstance(hist.index, pd.DatetimeIndex):
                hist["date"] = hist.index

            hist = hist.dropna(subset=["open", "high", "low", "close"])
            if "volume" not in hist.columns:
                hist["volume"] = None
            hist["volume"] = hist["volume"].where(pd.notna(hist["volume"]), None)

            rows = []
            for r in hist[["date", "open", "high", "low", "close", "volume"]].to_dict(orient="records"):
                payload = json_safe({
                    "symbol": s,
                    "date": str(pd.to_datetime(r["date"]).date()),
                    "open": r["open"],
                    "high": r["high"],
                    "low": r["low"],
                    "close": r["close"],
                    "volume": int(r["volume"]) if pd.notna(r["volume"]) else None
                })
                rows.append(payload)

            count = upsert_prices(rows)
            updated += 1
            print(f"[{s} ← {yf_sym}] upserts: {count}")

        except Exception as e:
            errors += 1
            print(f"[{s}] error con yfinance '{yf_sym}': {e}")

    print(f"\nResumen → ✅ actualizados:{updated} | ⏭️ saltados:{skipped} | ⚠️ errores:{errors}\n")


if __name__ == "__main__":
    main()
