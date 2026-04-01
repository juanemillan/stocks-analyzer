import os
import time
import math
import argparse
from typing import Dict, List, Tuple
import pandas as pd
import yfinance as yf
from dotenv import load_dotenv
from utils import get_connection

# ---------- Config ----------
DEFAULT_START = "2021-01-01"
BATCH_TICKERS = 80
UPSERT_CHUNK = 1000
SLEEP_BETWEEN_BATCH = 3.0


# ---------- Helpers ----------
def chunked(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i : i + n]


def read_symbol_map() -> Dict[str, str]:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT symbol FROM assets WHERE is_active = TRUE;")
    assets = [r[0] for r in cur.fetchall()]
    yahoo_by_symbol = {s: s for s in assets}

    try:
        cur.execute("SELECT symbol, yf_symbol FROM symbol_map;")
        for src, dst in cur.fetchall():
            yahoo_by_symbol[src] = dst or src
    except Exception:
        pass

    cur.close()
    conn.close()
    return yahoo_by_symbol


def read_already_fetched() -> set:
    """Returns set of symbols that already have data in prices_daily."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT symbol FROM prices_daily;")
    fetched = {r[0] for r in cur.fetchall()}
    cur.close()
    conn.close()
    return fetched


def normalize_single_ticker_df(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.reset_index()
    if "Date" in df.columns and "date" not in df.columns:
        df = df.rename(columns={"Date": "date"})
    if "date" not in df.columns:
        df = df.rename_axis("date").reset_index()
    df.columns = [c.lower() for c in df.columns]
    keep = ["date", "open", "high", "low", "close", "volume"]
    for k in keep:
        if k not in df.columns:
            df[k] = None
    out = df[keep].copy()
    out["symbol"] = ticker
    out["date"] = pd.to_datetime(out["date"]).dt.strftime("%Y-%m-%d")
    return out.dropna(subset=["date", "close"])


def normalize_multi_ticker_df(df: pd.DataFrame) -> Dict[str, pd.DataFrame]:
    result: Dict[str, pd.DataFrame] = {}
    if df.empty:
        return result
    if not isinstance(df.columns, pd.MultiIndex):
        return result

    df = df.reset_index()
    if "Date" in df.columns and "date" not in df.columns:
        df = df.rename(columns={"Date": "date"})
    if "date" not in df.columns:
        df = df.rename_axis("date").reset_index()

    tickers = sorted(list({c[1] for c in df.columns if isinstance(c, tuple)}))
    for t in tickers:
        sub = pd.DataFrame()
        sub["date"] = df["date"]
        for field in ["Open", "High", "Low", "Close", "Volume"]:
            if (field, t) in df.columns:
                sub[field.lower()] = df[(field, t)]
        sub = normalize_single_ticker_df(sub, t)
        if not sub.empty:
            result[t] = sub
    return result


def upsert_prices(rows: List[dict], conn):
    cur = conn.cursor()

    for chunk in chunked(rows, UPSERT_CHUNK):
        args_str = ",".join(
            cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", (
                r["symbol"], r["date"], r["open"], r["high"],
                r["low"], r["close"], r["volume"]
            )).decode() for r in chunk
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


# ---------- Main ----------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default=DEFAULT_START, help="Fecha inicio (YYYY-MM-DD)")
    parser.add_argument("--only", nargs="*", help="Lista de símbolos (DB) a forzar / debug")
    parser.add_argument("--batch", type=int, default=BATCH_TICKERS, help="tickers por lote")
    args, _ = parser.parse_known_args()

    mapping = read_symbol_map()
    if args.only:
        mapping = {s: mapping.get(s, s) for s in args.only if s in mapping}

    db_symbols = list(mapping.keys())
    if not db_symbols:
        print("No hay símbolos en assets.")
        return

    # Skip symbols already fetched (resume support), but always re-fetch the
    # last completed symbol in case its batch connection dropped mid-commit.
    if not args.only:
        already_fetched = read_already_fetched()
        # Find the last symbol in iteration order that was previously fetched
        last_fetched = None
        for s in db_symbols:
            if s in already_fetched:
                last_fetched = s
        if last_fetched:
            already_fetched.discard(last_fetched)
            print(f"  Re-descargando ultimo simbolo procesado: {last_fetched}")
        pending = [s for s in db_symbols if s not in already_fetched]
        skipped = len(db_symbols) - len(pending)
        if skipped:
            print(f"  Saltando {skipped} simbolos ya descargados, quedan {len(pending)}.")
        db_symbols = pending

    if not db_symbols:
        print("Todos los símbolos ya tienen datos. Usa --only para forzar.")
        return

    print(f"Descargando {len(db_symbols)} símbolos desde {args.start} (lotes de {args.batch})…")

    total_ok = 0
    batch_idx = 0

    for group_db in chunked(db_symbols, args.batch):
        batch_idx += 1
        group_yf = [mapping[s] for s in group_db]

        print(f"\nBatch {batch_idx}  [{len(group_db)} símbolos]")
        tries = 0
        df = pd.DataFrame()
        while tries < 3:
            try:
                df = yf.download(
                    tickers=group_yf,
                    start=args.start,
                    interval="1d",
                    auto_adjust=True,
                    actions=False,
                    progress=False,
                    threads=True,
                    group_by="column",
                )
                break
            except Exception as e:
                tries += 1
                print(f"  yfinance error (try {tries}/3):", e)
                time.sleep(2 * tries)
        if df.empty:
            print("  Batch vacío (Yahoo rate-limit o tickers sin data).")
            time.sleep(SLEEP_BETWEEN_BATCH)
            continue

        # One connection per batch (not per symbol) to avoid connection churn
        conn = None
        for attempt in range(3):
            try:
                conn = get_connection()
                break
            except Exception as e:
                print(f"  DB connect error (try {attempt+1}/3): {e}")
                time.sleep(3 * (attempt + 1))
        if conn is None:
            print("  No se pudo conectar a DB, saltando batch.")
            time.sleep(SLEEP_BETWEEN_BATCH)
            continue

        try:
            if isinstance(df.columns, pd.MultiIndex):
                per_ticker = normalize_multi_ticker_df(df)
                for s_db, s_yf in zip(group_db, group_yf):
                    dfi = per_ticker.get(s_yf)
                    if dfi is None or dfi.empty:
                        print(f"  {s_db} ({s_yf}): sin datos")
                        continue
                    rows = dfi.to_dict(orient="records")
                    upsert_prices(rows, conn)
                    total_ok += len(rows)
                    print(f"  {s_db} ({s_yf}): {len(rows)} filas ok")
            else:
                dfi = normalize_single_ticker_df(df, group_yf[0])
                rows = dfi.to_dict(orient="records")
                upsert_prices(rows, conn)
                total_ok += len(rows)
                print(f"  {group_db[0]} ({group_yf[0]}): {len(rows)} filas ok")
        finally:
            conn.close()

        time.sleep(SLEEP_BETWEEN_BATCH)

    print("\n✅ Resumen:")
    print("  Filas insertadas/actualizadas:", total_ok)


if __name__ == "__main__":
    main()
