import os
import time
import pandas as pd
import numpy as np
from utils import get_connection


def _t(label: str, t0: float) -> float:
    elapsed = time.time() - t0
    print(f"    [{elapsed:.1f}s] {label}")
    return time.time()


def compute_scores():
    t0 = time.time()
    conn = get_connection()
    cur = conn.cursor()

    # ── 1. Pull the last 370 calendar days of prices per symbol ──────────────
    print("  [1/7] Descargando precios recientes...")
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
    t0 = _t(f"{len(df):,} filas, {df['symbol'].nunique()} símbolos cargados", t0)

    # ── 2. Compute all metrics locally in pandas ──────────────────────────────
    print("  [2/7] Calculando métricas por símbolo...")
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
    t0 = _t(f"métricas calculadas para {len(result)} símbolos", t0)

    # ── 3. Relative strength vs SPY ───────────────────────────────────────────
    print("  [3/7] Calculando relative strength vs SPY...")
    spy_row = result[result["symbol"] == "SPY"]
    spy_mom3m = float(spy_row["mom_3m"].iloc[0]) if len(spy_row) > 0 else 0.0
    result["rs_spy"] = result["mom_3m"].fillna(0) - spy_mom3m
    t0 = _t("relative strength calculado", t0)

    # ── 4. Liquidity score (scaled 0–1 between 100K and 2M avg vol) ──────────
    print("  [4/7] Calculando liquidity score...")
    avg = result["avg_vol20"].astype(float)
    result["liq_score"] = np.clip((avg - 100_000) / 1_900_000, 0.0, 1.0)
    t0 = _t("liquidity score calculado", t0)

    # ── 5. Percent-rank normalisation across the universe ────────────────────
    print("  [5/7] Normalizando por percentil...")
    result["pr_mom1m"] = result["mom_1m"].rank(pct=True)
    result["pr_mom3m"] = result["mom_3m"].rank(pct=True)
    result["pr_rsspy"] = result["rs_spy"].rank(pct=True)
    result["pr_vol"]   = result["vol_20d"].rank(pct=True)
    vol_inv = result["pr_vol"].apply(lambda x: 0.5 if pd.isna(x) else 1 - x)
    t0 = _t("percentil calculado", t0)

    # ── 6. Weighted score with dynamic re-weighting for missing signals ───────
    print("  [6/7] Calculando score final (vectorizado)...")
    W = dict(mom1m=0.40, mom3m=0.20, rsspy=0.20, liq=0.10, volinv=0.10)

    # Vectorized — avoids slow row-by-row apply
    vol_inv_series = result["pr_vol"].where(result["pr_vol"].notna(), 0.5).rsub(1)
    signal_cols = [
        ("pr_mom1m",  W["mom1m"]),
        ("pr_mom3m",  W["mom3m"]),
        ("pr_rsspy",  W["rsspy"]),
        ("liq_score", W["liq"]),
    ]
    num = pd.Series(0.0, index=result.index)
    den = pd.Series(0.0, index=result.index)
    for col, w in signal_cols:
        mask = result[col].notna()
        num += np.where(mask, w * result[col].fillna(0), 0)
        den += np.where(mask, w, 0)
    # volinv always has a value (defaults to 0.5 when pr_vol is NaN)
    num += W["volinv"] * vol_inv_series
    den += W["volinv"]
    result["final_score"] = np.where(den > 0, num / den, np.nan)
    t0 = _t("score final calculado", t0)

    # ── 7. Bucket assignment ──────────────────────────────────────────────────
    print("  [7/7] Asignando buckets e insertando en DB...")
    def _bucket(s):
        if pd.isna(s):   return "Descartar"
        if s >= 0.70:    return "Alta Convicción"
        if s >= 0.50:    return "Vigilancia"
        return "Descartar"
    result["bucket"] = result["final_score"].apply(_bucket)

    # ── 8. Upsert into scores_daily ───────────────────────────────────────────
    target = result[result["symbol"] != "SPY"].copy()
    print(f"       Insertando {len(target)} scores en scores_daily...")

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
    conn.commit()
    _t(f"✅ {len(batch)} scores upserted en total", t0)
    cur.close()
    conn.close()

