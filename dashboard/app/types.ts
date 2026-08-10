export type ViewMode = "overview" | "diary" | "ranking" | "turnarounds" | "accumulation" | "compounders" | "value" | "portfolio" | "profile" | "favorites";

export type DailyInsight = {
  id?: number;
  date: string;
  lang: Lang;
  sentiment_score: number | null;
  sentiment_label: string | null;
  sentiment_summary: string | null;
  top_news: unknown | null;
  aggregate_scores: { avg_score?: number | null; count?: number | null } | null;
  notable_events: string | null;
  ai_insight: string | null;
  whale_activity: unknown | null;
  reviewer_feedback: string | null;
  raw_data: { ranking_text?: string | null } | null;
  version: string | null;
  created_at?: string | null;
};

export type RankRow = {
  symbol: string;
  name: string | null;
  asset_type: string | null;
  racional_url: string | null;
  logo_url?: string | null;
  website?: string | null;
  sector?: string | null;
  industry?: string | null;
  country?: string | null;
  description?: string | null;

  date: string;
  final_score: number | null;
  bucket: string | null;
  mom_1w: number | null;
  mom_1m: number | null;
  mom_3m?: number | null;
  mom_6m?: number | null;
  mom_1y?: number | null;
  rs_spy: number | null;
  tech_trend: number | null;
  liq_score: number | null;
  prev_score?: number | null;
  score_delta?: number | null;
};

export type TurnRow = {
  symbol: string;
  name: string | null;
  asset_type: string | null;
  racional_url: string | null;
  date: string;
  close: number | null;
  rebound_from_low: number | null;
  mom_1m: number | null;
  mom_3m: number | null;
  vol_surge: number | null;
  liq_score: number | null;
};

export type AccumRow = {
  symbol: string;
  name: string | null;
  asset_type: string | null;
  racional_url: string | null;
  date: string;
  close: number | null;
  pct_above_52w_low: number | null;
  pct_from_52w_high: number | null;
  mom_1w: number | null;
  mom_1m: number | null;
  mom_3m: number | null;
  vol_surge: number | null;
  liq_score: number | null;
};

export type CompoundRow = {
  symbol: string;
  name: string | null;
  asset_type: string | null;
  racional_url: string | null;
  first_close: number | null;
  last_close: number | null;
  cagr_1y?: number | null;
  cagr_3y?: number | null;
  cagr_5y?: number | null;
  pos_month_ratio: number | null;
  max_drawdown: number | null;
  days_covered: number | null;
};

export type ValueQualityRow = {
  symbol: string;
  name: string | null;
  asset_type: string | null;
  racional_url: string | null;
  sector: string | null;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  enterprise_to_ebitda: number | null;
  free_cashflow: number | null;
  total_debt: number | null;
  total_cash: number | null;
  return_on_equity: number | null;
  profit_margins: number | null;
  revenue_growth: number | null;
  value_quality_score: number;
};

export type AssetValuation = {
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  enterprise_to_ebitda: number | null;
  free_cashflow: number | null;
  total_debt: number | null;
  total_cash: number | null;
  return_on_equity: number | null;
  profit_margins: number | null;
  revenue_growth: number | null;
  valuation_updated_at: string | null;
};

export type PriceRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Lang = "es" | "en";

export type FinnhubData = {
  news: { headline: string; url: string; source: string; datetime: number }[];
  recommendation: {
    buy: number;
    hold: number;
    sell: number;
    strongBuy: number;
    strongSell: number;
    period: string;
  } | null;
  quote: { c: number; h: number; l: number; o: number; pc: number; dp: number } | null;
  metrics: {
    marketCapitalization: number | null;
    peBasicExclExtraTTM: number | null;
    ebitdaAnnual: number | null;
    dividendYieldIndicatedAnnual: number | null;
    revenueGrowthTTMYoy: number | null;
    epsBasicExclExtraItemsTTM: number | null;
    "52WeekHigh": number | null;
    "52WeekLow": number | null;
  } | null;
  ownership: { name: string; sharePercent: number; change: number; filingDate: string }[] | null;
};
