-- ===========================================
-- 01_compute_scores_daily.sql
-- Adaptado para CockroachDB (no función, script ejecutable)
-- ===========================================

-- Elimina registros existentes de scores del día más reciente
-- (para evitar duplicados si se vuelve a correr el cálculo)
DELETE FROM scores_daily
WHERE (symbol, date) IN (
  SELECT symbol, MAX(date) AS date
  FROM scores_daily
  GROUP BY symbol
);

-- Calcular métricas diarias con CTEs
WITH last_dates AS (
  SELECT symbol, MAX(date) AS last_date
  FROM prices_daily
  GROUP BY symbol
),
px AS (
  SELECT p.*
  FROM prices_daily p
  JOIN last_dates ld
    ON p.symbol = ld.symbol
   AND p.date BETWEEN ld.last_date - INTERVAL '250 days' AND ld.last_date
),
base AS (
  SELECT
    symbol, date, open, high, low, close, volume,
    LAG(close, 1) OVER (PARTITION BY symbol ORDER BY date) AS prev_close
  FROM px
),
metrics AS (
  SELECT
    symbol,
    date,
    close,
    high,
    low,
    volume,
    (close / LAG(close, 5)  OVER (PARTITION BY symbol ORDER BY date) - 1.0) AS mom_1w,
    (close / LAG(close, 21) OVER (PARTITION BY symbol ORDER BY date) - 1.0) AS mom_1m,
    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW)   AS sma20,
    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 49 PRECEDING AND CURRENT ROW)   AS sma50,
    AVG(close) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 199 PRECEDING AND CURRENT ROW)  AS sma200,
    GREATEST(
      high - low,
      ABS(high - prev_close),
      ABS(prev_close - low)
    ) AS tr,
    AVG(
      GREATEST(
        high - low,
        ABS(high - prev_close),
        ABS(prev_close - low)
      )
    ) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 13 PRECEDING AND CURRENT ROW) AS atr14,
    AVG(volume) OVER (PARTITION BY symbol ORDER BY date ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) AS avg_vol20
  FROM base
),
last_row AS (
  SELECT DISTINCT ON (symbol)
    symbol, date, close, mom_1w, mom_1m, sma20, sma50, sma200, atr14, avg_vol20
  FROM metrics
  ORDER BY symbol, date DESC
),
spy AS (
  SELECT mom_1m AS spy_mom_1m
  FROM last_row
  WHERE symbol = 'SPY'
  LIMIT 1
),
scored AS (
  SELECT
    lr.symbol,
    lr.date,
    lr.mom_1w,
    lr.mom_1m,
    (CASE WHEN lr.sma20 IS NOT NULL AND lr.sma50 IS NOT NULL AND lr.sma20 > lr.sma50 THEN 1 ELSE 0 END
     + CASE WHEN lr.sma200 IS NOT NULL AND lr.close > lr.sma200 THEN 0.5 ELSE 0 END) AS tech_trend,
    CASE
      WHEN lr.atr14 IS NULL OR lr.close IS NULL THEN NULL
      ELSE (lr.atr14::FLOAT8 / NULLIF(lr.close::FLOAT8,0))
    END AS atr_ratio,
    CASE
      WHEN lr.avg_vol20 IS NULL THEN 0
      WHEN lr.avg_vol20 >= 2000000 THEN 1.0
      WHEN lr.avg_vol20 <= 100000  THEN 0.0
      ELSE (lr.avg_vol20::FLOAT8 - 100000) / (2000000.0 - 100000.0)
    END AS liq_score,
    (lr.mom_1m - COALESCE((SELECT spy_mom_1m FROM spy), 0)) AS rs_spy,
    lr.atr14
  FROM last_row lr
),
finalized AS (
  SELECT
    symbol,
    date,
    mom_1w,
    mom_1m,
    rs_spy,
    atr14,
    tech_trend,
    liq_score,
    CASE
      WHEN atr_ratio IS NULL THEN NULL
      ELSE 1 - LEAST(1.0, GREATEST(0.0, atr_ratio / 0.10))
    END AS vol_score,
    (
      0.35 * COALESCE(mom_1m::FLOAT8,0) +
      0.15 * COALESCE(mom_1w::FLOAT8,0) +
      0.20 * (COALESCE(tech_trend::FLOAT8,0) / 1.5) +
      0.20 * COALESCE(rs_spy::FLOAT8,0) +
      0.10 * COALESCE(liq_score::FLOAT8,0)
    ) AS final_score
  FROM scored
)

-- Insertar nuevos scores
UPSERT INTO scores_daily
  (symbol, date, mom_1w, mom_1m, rs_spy, atr_14, liq_score, tech_trend, final_score, bucket, notes)
SELECT
  f.symbol,
  f.date,
  f.mom_1w,
  f.mom_1m,
  f.rs_spy,
  f.atr14,
  f.liq_score,
  f.tech_trend,
  f.final_score,
  CASE
    WHEN f.final_score >= 0.70 THEN 'Alta Convicción'
    WHEN f.final_score >= 0.50 THEN 'Vigilancia'
    ELSE 'Descartar'
  END AS bucket,
  NULL
FROM finalized f
WHERE f.symbol <> 'SPY';
