import os
import pandas as pd
import numpy as np
from utils import get_connection


def compute_scores():
    conn = get_connection()
    cur = conn.cursor()

    # ── 1. Pull the last 370 calendar days of prices per symbol ──────────────
    print("  Descargando precios recientes...")
    cur.execute("""
        SELECT p.symbol, p.date, p.close, p.volume
        FROM prices_daily p
        JOIN (
            SELECT symbol, MAX(date) as last_date FROM prices_daily GROUP BY symbol
        ) ld ON ld.symbol = p.symbol
        WHERE p.date >= ld.last_date - '370 days'::interval
        ORDER BY p.symbol, p.date
    """)
    rows = cur.fetchall()
    df = pd.DataFrame(rows, columns=["symbol", "date", "close", "volume"])
    df["close"] = df["close"].astype(float)
    df["volume"] = df["volume"].astype(float)
    print(f"  {len(df):,} filas, {df['symbol'].nunique()} símbolos")

    # ── 2. Compute all metrics locally in pandas ──────────────────────────────
    df = df.sort_values(["symbol", "date"]).reset_index(drop=True)

    def _metrics(g):
        g = g.sort_values("date").copy()
        c = g["close"]
        v = g["volume"]
        log_ret = np.where((c > 0) & (c.shift(1) > 0), np.log(c) - np.log(c.shift(1)), np.nan)

        g["mom_1w"]  = c / c.shift(5)  - 1
        g["mom_1m"]  = c / c.shift(21) - 1
        g["mom_3m"]  = c / c.shift(63) - 1
        g["mom_6m"]  = c / c.shift(126) - 1
        g["mom_1y"]  = c / c.shift(252) - 1
        g["avg_vol20"] = v.rolling(20, min_periods=1).mean()
        g["vol_20d"]   = pd.Series(log_ret, index=g.index).rolling(20, min_periods=2).std()
        return g.iloc[[-1]]  # keep only the most recent row per symbol

    result = df.groupby("symbol", group_keys=False).apply(_metrics).reset_index(drop=True)
    result = result.dropna(subset=["close"])

    # ── 3. Relative strength vs SPY ───────────────────────────────────────────
    spy_row = result[result["symbol"] == "SPY"]
    spy_mom3m = float(spy_row["mom_3m"].iloc[0]) if len(spy_row) > 0 else 0.0
    result["rs_spy"] = result["mom_3m"].fillna(0) - spy_mom3m

    # ── 4. Liquidity score (scaled 0–1 between 100K and 2M avg vol) ──────────
    avg = result["avg_vol20"].astype(float)
    result["liq_score"] = np.clip((avg - 100_000) / 1_900_000, 0.0, 1.0)

    # ── 5. Percent-rank normalisation across the universe ────────────────────
    result["pr_mom1m"] = result["mom_1m"].rank(pct=True)
    result["pr_mom3m"] = result["mom_3m"].rank(pct=True)
    result["pr_rsspy"] = result["rs_spy"].rank(pct=True)
    result["pr_vol"]   = result["vol_20d"].rank(pct=True)
    vol_inv = result["pr_vol"].apply(lambda x: 0.5 if pd.isna(x) else 1 - x)

    # ── 6. Weighted score with dynamic re-weighting for missing signals ───────
    W = dict(mom1m=0.40, mom3m=0.20, rsspy=0.20, liq=0.10, volinv=0.10)
    pr = result[["pr_mom1m", "pr_mom3m", "pr_rsspy", "liq_score"]].copy()

    def _score(row):
        parts = {
            "mom1m":  (W["mom1m"],  row["pr_mom1m"]  if not pd.isna(row["pr_mom1m"])  else None),
            "mom3m":  (W["mom3m"],  row["pr_mom3m"]  if not pd.isna(row["pr_mom3m"])  else None),
            "rsspy":  (W["rsspy"],  row["pr_rsspy"]  if not pd.isna(row["pr_rsspy"])  else None),
            "liq":    (W["liq"],    row["liq_score"] if not pd.isna(row["liq_score"]) else None),
            "volinv": (W["volinv"], 1 - (row["pr_vol"] if not pd.isna(row["pr_vol"]) else 0.5)),
        }
        num = sum(w * v for w, v in parts.values() if v is not None)
        den = sum(w for w, v in parts.values() if v is not None)
        return num / den if den > 0 else None

    result["final_score"] = result.apply(_score, axis=1)

    # ── 7. Bucket assignment ──────────────────────────────────────────────────
    def _bucket(s):
        if pd.isna(s):   return "Descartar"
        if s >= 0.70:    return "Alta Convicción"
        if s >= 0.50:    return "Vigilancia"
        return "Descartar"
    result["bucket"] = result["final_score"].apply(_bucket)

    # ── 8. Upsert into scores_daily ───────────────────────────────────────────
    target = result[result["symbol"] != "SPY"].copy()
    print(f"  Insertando {len(target)} scores...")

    upsert_sql = """
        INSERT INTO scores_daily
          (symbol, date, mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
           rs_spy, liq_score, tech_trend, final_score, bucket, notes)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (symbol, date) DO UPDATE SET
          mom_1w      = EXCLUDED.mom_1w,
          mom_1m      = EXCLUDED.mom_1m,
          mom_3m      = EXCLUDED.mom_3m,
          mom_6m      = EXCLUDED.mom_6m,
          mom_1y      = EXCLUDED.mom_1y,
          rs_spy      = EXCLUDED.rs_spy,
          liq_score   = EXCLUDED.liq_score,
          final_score = EXCLUDED.final_score,
          bucket      = EXCLUDED.bucket,
          notes       = EXCLUDED.notes
    """

    def _float(x):
        return None if pd.isna(x) else float(x)

    batch = [
        (
            row["symbol"],
            row["date"],
            _float(row["mom_1w"]),
            _float(row["mom_1m"]),
            _float(row["mom_3m"]),
            _float(row["mom_6m"]),
            _float(row["mom_1y"]),
            _float(row["rs_spy"]),
            _float(row["liq_score"]),
            None,                       # tech_trend (not yet implemented)
            _float(row["final_score"]),
            row["bucket"],
            "PY",
        )
        for _, row in target.iterrows()
    ]
    cur.executemany(upsert_sql, batch)
    print(f"  ✅ {len(batch)} scores upserted.")
    cur.close()
    conn.close()

