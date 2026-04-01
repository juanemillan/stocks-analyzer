-- ===========================================
-- 00_schema.sql — Stocks Analyzer
-- Adaptado para CockroachDB
-- ===========================================

-- 🧩 Tabla de activos listados por Racional
CREATE TABLE IF NOT EXISTS assets (
  symbol TEXT PRIMARY KEY,
  name TEXT,
  asset_type TEXT CHECK (asset_type IN ('EQUITY','ETF','FUND','OTHER')),
  racional_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  inserted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 🧩 Precios OHLCV diarios
CREATE TABLE IF NOT EXISTS prices_daily (
  symbol TEXT REFERENCES assets(symbol) ON DELETE CASCADE,
  date DATE,
  open DECIMAL,
  high DECIMAL,
  low DECIMAL,
  close DECIMAL,
  volume BIGINT,
  PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_prices_symbol_date ON prices_daily (symbol, date);

-- 🧩 Scores diarios (ranking y métricas)
CREATE TABLE IF NOT EXISTS scores_daily (
  symbol TEXT REFERENCES assets(symbol) ON DELETE CASCADE,
  date DATE,
  mom_1w DECIMAL,
  mom_1m DECIMAL,
  mom_3m DECIMAL,
  mom_6m DECIMAL,
  mom_1y DECIMAL,
  rs_spy DECIMAL,
  atr_14 DECIMAL,
  liq_score DECIMAL,
  tech_trend DECIMAL,
  final_score DECIMAL,
  bucket TEXT,
  notes TEXT,
  PRIMARY KEY (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_scores_symbol_date ON scores_daily (symbol, date);

-- 🧩 Mapeo de tus símbolos a tickers de yfinance (para sufijos/regionales)
CREATE TABLE IF NOT EXISTS symbol_map (
  symbol TEXT PRIMARY KEY REFERENCES assets(symbol) ON DELETE CASCADE,
  yf_symbol TEXT NOT NULL,
  notes TEXT
);

-- 🧩 Semilla 1:1 opcional de mapeo
-- Cockroach no soporta "ON CONFLICT DO NOTHING" dentro de INSERT ... SELECT,
-- así que usamos una verificación condicional
INSERT INTO symbol_map(symbol, yf_symbol)
SELECT a.symbol, a.symbol
FROM assets a
WHERE a.symbol NOT IN (SELECT symbol FROM symbol_map);
