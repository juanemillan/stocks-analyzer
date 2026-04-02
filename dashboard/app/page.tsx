"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { getRanking, getTurnarounds, getCompounders, getPrices, getLatestPrices, getFinnhubData, getAccumulationZone } from "./actions";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// =================== Constantes ===================
const BUCKETS = ["Alta Convicción", "Vigilancia", "Descartar"] as const;
const TYPES = ["EQUITY", "ETF", "FUND", "OTHER"] as const;
const RANGE_OPTIONS: Array<{ key: string; days: number }> = [
  { key: "1D", days: 1 },
  { key: "1S", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 365 * 5 },
];

type ViewMode = "overview" | "ranking" | "turnarounds" | "accumulation" | "compounders" | "portfolio";

// =================== Tipos ===================
type RankRow = {
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
};

type TurnRow = {
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

type AccumRow = {
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

type CompoundRow = {
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
  max_drawdown: number | null; // negativo (ej: -0.32 = -32%)
  days_covered: number | null;
};

type PriceRow = { date: string; close: number };

// =================== i18n ===================
type Lang = "es" | "en";

const LABELS = {
  tabRanking:        { es: "Ranking",        en: "Ranking" },
  tabTurnarounds:    { es: "Turnarounds",    en: "Turnarounds" },
  tabCompounders:    { es: "Compounders",    en: "Compounders" },
  loadingBtn:        { es: "Cargando\u2026",      en: "Loading\u2026" },
  reloadBtn:         { es: "Recargar",       en: "Reload" },
  selectSymbol:      { es: "Selecciona un s\u00edmbolo",                en: "Select a symbol" },
  pickSymbol:        { es: "Elige un s\u00edmbolo para ver el gr\u00e1fico", en: "Choose a symbol to view the chart" },
  loadingPrices:     { es: "Cargando precios\u2026",                   en: "Loading prices\u2026" },
  noPriceData:       { es: "Sin datos de precio",                   en: "No price data" },
  signals:           { es: "Se\u00f1ales",        en: "Signals" },
  liquidity:         { es: "Liquidez",       en: "Liquidity" },
  trend:             { es: "Tendencia",      en: "Trend" },
  viewInRacional:    { es: "Ver en Racional", en: "View in Racional" },
  searchPlaceholder: { es: "Buscar s\u00edmbolo o nombre\u2026", en: "Search symbol or name\u2026" },
  bucketAll:         { es: "Bucket (todos)",  en: "Bucket (all)" },
  typeAll:           { es: "Tipo (todos)",    en: "Type (all)" },
  minScore:          { es: "Min score",       en: "Min score" },
  sortBy:            { es: "Ordenar por:",    en: "Sort by:" },
  results:           { es: "resultados",      en: "results" },
  candidates:        { es: "candidatos",      en: "candidates" },
  perPage:           { es: "p\u00e1g",             en: "pg" },
  symbol:            { es: "S\u00edmbolo",        en: "Symbol" },
  name:              { es: "Nombre",          en: "Name" },
  type:              { es: "Tipo",            en: "Type" },
  action:            { es: "Acci\u00f3n",         en: "Action" },
  view:              { es: "Ver",             en: "View" },
  noResults:         { es: "No hay resultados con los filtros actuales.", en: "No results match the current filters." },
  rebound52w:        { es: "Rebote 52w",      en: "52w Rebound" },
  noCandidates:      { es: "Sin candidatos",  en: "No candidates" },
  horizon:           { es: "Horizonte:",      en: "Horizon:" },
  posMonthsFilter:   { es: "% meses + \u2265",    en: "% pos. months \u2265" },
  posMonthsCol:      { es: "% meses +",       en: "% pos. months" },
  cagrMin:           { es: "CAGR \u2265",         en: "CAGR \u2265" },
  maxDD:             { es: "Max DD \u2265",        en: "Max DD \u2265" },
  days:              { es: "D\u00edas",           en: "Days" },
  prev:              { es: "\u2190 Anterior",     en: "\u2190 Prev" },
  pageLabel:         { es: "P\u00e1g.",           en: "Pg." },
  next:              { es: "Siguiente \u2192",    en: "Next \u2192" },
  seeLess:           { es: "Ver menos",       en: "See less" },
  seeMore:           { es: "Ver m\u00e1s",        en: "See more" },
  footer:            { es: "Racional Dashboard \u2022 CockroachDB + yfinance \u2022 Rangos diarios: 1D\u20135Y",
                       en: "Racional Dashboard \u2022 CockroachDB + yfinance \u2022 Daily ranges: 1D\u20135Y" },
  tabOverview:       { es: "Resumen",          en: "Overview" },
  tabPortfolio:      { es: "Mi Portfolio",     en: "My Portfolio" },
  portEmptyTitle:    { es: "Sin posiciones",   en: "No positions yet" },
  portEmptyDesc:     { es: "Añade tu primera posición para hacer seguimiento.", en: "Add your first holding to start tracking." },
  portAddHolding:    { es: "+ Añadir posición", en: "+ Add holding" },
  portSymbol:        { es: "Símbolo",           en: "Symbol" },
  portShares:        { es: "Acciones",          en: "Shares" },
  portAvgCost:       { es: "Costo promedio",    en: "Avg cost" },
  portSave:          { es: "Guardar",           en: "Save" },
  portCancel:        { es: "Cancelar",          en: "Cancel" },
  portDelete:        { es: "Eliminar",          en: "Remove" },
  portLastPrice:     { es: "Último precio",      en: "Last price" },
  portMarketValue:   { es: "Valor de mercado",   en: "Market value" },
  portPnL:           { es: "P&L",               en: "P&L" },
  portDataAsOf:      { es: "Precios al",         en: "Prices as of" },
  portLoading:       { es: "Cargando portfolio…", en: "Loading portfolio…" },
  portLogout:        { es: "Cerrar sesión",     en: "Sign out" },
  topRanking:        { es: "Top Ranking",      en: "Top Ranking" },
  topTurnarounds:    { es: "Turnarounds",      en: "Turnarounds" },
  topCompounders:    { es: "Compounders",      en: "Compounders" },
  seeAll:            { es: "Ver todos \u2192",  en: "See all \u2192" },
  bktHighConviction: { es: "Alta Convicci\u00f3n", en: "High Conviction" },
  bktWatch:          { es: "Vigilancia",       en: "Watch" },
  bktDiscard:        { es: "Descartar",        en: "Discard" },
  legendTitle:       { es: "Glosario de m\u00e9tricas", en: "Metrics glossary" },
  legendClose:       { es: "Cerrar",           en: "Close" },
  lgScoreTitle:      { es: "Score",            en: "Score" },
  lgScoreDesc:       { es: "Puntuaci\u00f3n compuesta (0\u20131) que combina momentum, liquidez y tendencia t\u00e9cnica. Mayor score = mayor convicci\u00f3n.",
                       en: "Composite score (0\u20131) combining momentum, liquidity and technical trend. Higher = stronger conviction." },
  lgBucketTitle:     { es: "Bucket",           en: "Bucket" },
  lgBucketDesc:      { es: "Clasificaci\u00f3n editorial: Alta Convicci\u00f3n (score \u2265 0.7), Vigilancia (0.4\u20130.7), Descartar (< 0.4).",
                       en: "Editorial classification: High Conviction (score \u2265 0.7), Watch (0.4\u20130.7), Discard (< 0.4)." },
  lgMomTitle:        { es: "Momentum (Mom 1w / 1m / 3m / 6m / 1y)", en: "Momentum (Mom 1w / 1m / 3m / 6m / 1y)" },
  lgMomDesc:         { es: "Retorno del precio en la ventana indicada (1 semana, 1 mes, etc.). Positivo = el activo sube en ese per\u00edodo.",
                       en: "Price return over the given window (1 week, 1 month, etc.). Positive = asset is up over that period." },
  lgRsTitle:         { es: "RS vs SPY",        en: "RS vs SPY" },
  lgRsDesc:          { es: "Fuerza relativa frente al S&P 500. Positivo significa que el activo supera al \u00edndice en ese per\u00edodo.",
                       en: "Relative strength vs. S&P 500. Positive means the asset outperforms the index over that period." },
  lgLiqTitle:        { es: "Liquidez",         en: "Liquidity" },
  lgLiqDesc:         { es: "Score de liquidez basado en volumen promedio. Mayor valor = m\u00e1s f\u00e1cil de entrar/salir sin impacto.",
                       en: "Liquidity score based on average volume. Higher = easier to enter/exit without price impact." },
  lgTrendTitle:      { es: "Tendencia",        en: "Trend" },
  lgTrendDesc:       { es: "Score t\u00e9cnico de tendencia (medias m\u00f3viles). +1 = tendencia alcista fuerte, -1 = bajista fuerte.",
                       en: "Technical trend score (moving averages). +1 = strong uptrend, -1 = strong downtrend." },
  lgCagrTitle:       { es: "CAGR",             en: "CAGR" },
  lgCagrDesc:        { es: "Tasa de crecimiento anual compuesta del precio en el horizonte seleccionado (1Y / 3Y / 5Y).",
                       en: "Compound Annual Growth Rate of the price over the selected horizon (1Y / 3Y / 5Y)." },
  lgPosTitle:        { es: "% Meses positivos", en: "% Positive months" },
  lgPosDesc:         { es: "Porcentaje de meses con retorno positivo en el horizonte. Indica la consistencia del crecimiento.",
                       en: "Percentage of months with positive return in the horizon. Indicates consistency of growth." },
  lgMddTitle:        { es: "Max Drawdown",     en: "Max Drawdown" },
  lgMddDesc:         { es: "Caida m\u00e1xima desde el pico hasta el valle en el per\u00edodo. Indica el riesgo de p\u00e9rdida no realizada.",
                       en: "Maximum peak-to-trough decline in the period. Indicates the worst unrealized loss risk." },
  lgRebTitle:        { es: "Rebote 52w",       en: "52w Rebound" },
  lgRebDesc:         { es: "Cu\u00e1nto ha subido el precio desde su m\u00ednimo de las \u00faltimas 52 semanas. Candidatos con rebote > 20% desde el piso.",
                       en: "How much the price has risen from its 52-week low. Candidates showing > 20% bounce from the floor." },
  lgVolTitle:        { es: "Vol surge",        en: "Vol surge" },
  lgVolDesc:         { es: "Ratio entre el volumen reciente y el volumen promedio hist\u00f3rico. > 2\u00d7 indica actividad inusual.",
                       en: "Ratio of recent volume vs. historical average. > 2\u00d7 signals unusual activity." },
  editProfile:       { es: "Editar perfil",       en: "Edit profile" },
  editDisplayName:   { es: "Nombre para mostrar", en: "Display name" },
  editSave:          { es: "Guardar",             en: "Save" },
  editCancel:           { es: "Cancelar",            en: "Cancel" },
  viewInTradingView:    { es: "Ver en TradingView",  en: "View in TradingView" },
  analystConsensus:     { es: "Consenso analistas",  en: "Analyst consensus" },
  latestNews:           { es: "Últimas noticias",    en: "Latest news" },
  strongBuy:            { es: "Compra fuerte",       en: "Strong Buy" },
  strongSell:           { es: "Venta fuerte",        en: "Strong Sell" },
  marketCap:            { es: "Cap. mercado",        en: "Market cap" },
  peRatio:              { es: "P/E",                 en: "P/E" },
  ebitda:               { es: "EBITDA",              en: "EBITDA" },
  divYield:             { es: "Div. yield",          en: "Div. yield" },
  prevClose:            { es: "Cierre ayer",         en: "Prev. close" },
  dayHigh:              { es: "Máx. ayer",           en: "Day high" },
  dayLow:               { es: "Mín. ayer",           en: "Day low" },
  dayOpen:              { es: "Apertura",             en: "Open" },
  priceChange:          { es: "Variación",            en: "Change" },
  week52High:           { es: "Máx. 52s",            en: "52w high" },
  week52Low:            { es: "Mín. 52s",             en: "52w low" },
  eps:                  { es: "EPS (TTM)",            en: "EPS (TTM)" },
  revenueGrowth:        { es: "Crec. ingresos",       en: "Revenue growth" },
  fundamentals:         { es: "Fundamentales",        en: "Fundamentals" },
  companyDescription:   { es: "Descripción",          en: "About" },
  momentum:             { es: "Momentum",             en: "Momentum" },
  technicals:           { es: "Técnicos",             en: "Technicals" },
  infoHowItWorks:       { es: "¿Cómo funciona?",      en: "How it works" },
  infoOverviewText: {
    es: "Panel de análisis cuantitativo. Cada activo recibe un score que combina momentum (velocidad de subida/bajada del precio), liquidez (volumen de operaciones) y tendencia técnica (medias móviles). Los tres módulos muestran los mejores candidatos de cada estrategia. Haz clic en cualquier activo para ver su gráfico y señales detalladas.",
    en: "Quantitative analysis dashboard. Each asset gets a score combining momentum (price movement speed), liquidity (trading volume) and technical trend (moving averages). The three modules show top candidates from each strategy. Click any asset to view its chart and detailed signals.",
  },
  infoRankingText: {
    es: "Activos ordenados por score compuesto (0–1). Alta Convicción (≥ 0.7): momentum fuerte, alta liquidez y tendencia alcista — candidatos de mayor probabilidad. Vigilancia (0.4–0.7): señales mixtas, seguir de cerca. Descartar (< 0.4): sin catalizadores claros. Filtra por bucket, tipo y score mínimo; haz clic en cualquier fila para ver el gráfico.",
    en: "Assets ranked by composite score (0–1). High Conviction (≥ 0.7): strong momentum, high liquidity and uptrend — highest-probability candidates. Watch (0.4–0.7): mixed signals, monitor closely. Discard (< 0.4): no clear catalysts. Filter by bucket, type and minimum score; click any row to view the chart.",
  },
  infoTurnaroundsText: {
    es: "Candidatos a recuperación: activos que han rebotado desde su mínimo de 52 semanas con aumento inusual de volumen. Son apuestas contrarias — mayor riesgo que el Ranking, pero mayor potencial si la recuperación se confirma. Un buen candidato tiene rebote > 20% desde el piso y vol surge > 2×. Úsalos como señal de alerta temprana, no como certeza.",
    en: "Recovery candidates: assets bouncing from 52-week lows with unusual volume surge. These are contrarian bets — higher risk than Ranking, but greater upside if recovery confirms. A good candidate has rebound > 20% from the floor and vol surge > 2×. Use as an early warning signal, not a certainty.",
  },
  infoCompoundersText: {
    es: "Activos con crecimiento compuesto históricamente sostenido. CAGR: retorno anual del precio en el horizonte elegido (1Y/3Y/5Y). % Meses positivos: consistencia del crecimiento — por encima del 60% significa que sube la mayoría de los meses. Max Drawdown: la peor caída desde pico a valle — menos negativo es mejor. Un compounder ideal tiene CAGR > 15%, meses positivos > 60% y drawdown máximo mejor que −30%.",
    en: "Assets with historically sustained compound growth. CAGR: annualized price return over the chosen horizon (1Y/3Y/5Y). % Positive months: growth consistency — above 60% means it rises most months. Max Drawdown: worst peak-to-trough drop — less negative is better. An ideal compounder has CAGR > 15%, positive months > 60% and max drawdown better than −30%.",
  },
  infoPortfolioText: {
    es: "Rastrea tus posiciones personales. Añade símbolo, número de acciones y costo promedio de compra para ver el P&L (ganancia/pérdida no realizada) calculado con el último precio de cierre disponible. Haz clic en cualquier símbolo para ver su gráfico.",
    en: "Track your personal positions. Add symbol, number of shares and average purchase cost to see unrealized P&L calculated using the last available closing price. Click any symbol to view its chart.",
  },
} as const;

function t(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang];
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const esRef = useRef<HTMLButtonElement>(null);
  const enRef = useRef<HTMLButtonElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const btn = lang === "es" ? esRef.current : enRef.current;
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }, [lang]);

  return (
    <div className="relative inline-flex rounded-xl overflow-hidden border dark:border-neutral-700 text-sm bg-white dark:bg-neutral-900">
      {pill.ready && (
        <span
          className="absolute top-0 bottom-0 bg-black dark:bg-white rounded-xl transition-all duration-200 ease-in-out pointer-events-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      <button ref={esRef} onClick={() => setLang("es")}
        className={`relative z-10 px-2 py-1 transition-colors duration-150 ${lang === "es" ? "text-white dark:text-black font-medium" : "text-gray-600 hover:text-gray-900 dark:text-gray-400"}` }>
        ES
      </button>
      <button ref={enRef} onClick={() => setLang("en")}
        className={`relative z-10 px-2 py-1 transition-colors duration-150 ${lang === "en" ? "text-white dark:text-black font-medium" : "text-gray-600 hover:text-gray-900 dark:text-gray-400"}`}>
        EN
      </button>
    </div>
  );
}

// =================== Tab Bar ===================
type TabDef = { key: ViewMode; label: (lang: Lang) => string };
const TAB_DEFS: TabDef[] = [
  { key: "overview",     label: (lang) => t("tabOverview", lang) },
  { key: "ranking",      label: () => "Ranking" },
  { key: "turnarounds",  label: () => "Turnarounds" },
  { key: "accumulation", label: (lang) => lang === "es" ? "Zona Acumulación" : "Accumulation" },
  { key: "compounders",  label: () => "Compounders" },
  { key: "portfolio",    label: (lang) => t("tabPortfolio", lang) },
];

function SlidingTabBar({ viewMode, setViewMode, lang }: { viewMode: ViewMode; setViewMode: (v: ViewMode) => void; lang: Lang }) {
  const btnRefs = useRef<Partial<Record<ViewMode, HTMLButtonElement | null>>>({});
  const [pill, setPill] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });

  useEffect(() => {
    const btn = btnRefs.current[viewMode];
    if (btn) setPill({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }, [viewMode]);

  return (
    <div className="relative inline-flex rounded-xl overflow-hidden border dark:border-neutral-700 flex-none bg-white dark:bg-neutral-900">
      {pill.ready && (
        <span
          className="absolute top-0 bottom-0 bg-black dark:bg-white rounded-xl transition-all duration-200 ease-in-out pointer-events-none"
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {TAB_DEFS.map(({ key, label }) => (
        <button
          key={key}
          ref={(el) => { btnRefs.current[key] = el; }}
          onClick={() => setViewMode(key)}
          className={`relative z-10 px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap transition-colors duration-150 ${
            viewMode === key ? "text-white dark:text-black font-medium" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {label(lang)}
        </button>
      ))}
    </div>
  );
}

// =================== Helpers ===================
function logoSrc(symbol: string) {
  return `/api/logo/${encodeURIComponent(symbol)}`;
}

const BUCKET_KEY_MAP: Record<string, keyof typeof LABELS> = {
  "Alta Convicci\u00f3n": "bktHighConviction",
  "Vigilancia":         "bktWatch",
  "Descartar":          "bktDiscard",
};
function bucketDisplay(b: string, lang: Lang): string {
  const key = BUCKET_KEY_MAP[b];
  return key ? LABELS[key][lang] : b;
}
function bucketColor(b: string): string {
  if (b === "Alta Convicci\u00f3n") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (b === "Vigilancia")         return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (b === "Descartar")          return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

// =================== Componente ===================
export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode | null>(null);

  // Ranking
  const [rows, setRows] = useState<RankRow[]>([]);
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<string>("");
  const [atype, setAtype] = useState<string>("");
  const [minScore, setMinScore] = useState<number>(0);
  const [sortKey, setSortKey] = useState<keyof RankRow>("final_score");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Turnarounds
  const [turnRows, setTurnRows] = useState<TurnRow[]>([]);

  // Accumulation Zone
  const [accumRows, setAccumRows] = useState<AccumRow[]>([]);
  const [accumPage, setAccumPage] = useState<number>(0);

  // Compounders
  const [compoundRows, setCompoundRows] = useState<CompoundRow[]>([]);
  const [cmpHorizon, setCmpHorizon] = useState<"1Y" | "3Y" | "5Y">("1Y");
  const [cagrMin, setCagrMin] = useState<number>(0.15); // 15% anual por defecto
  const [posMonthsMin, setPosMonthsMin] = useState<number>(0.55); // 55% meses +
  const [maxDDMax, setMaxDDMax] = useState<number>(-0.4); // Máx drawdown permitido (ej. -40%)

  // Paginación (pageSize compartido entre pestañas)
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(0);         // ranking
  const [turnPage, setTurnPage] = useState<number>(0);  // turnarounds
  const [cmpPage, setCmpPage] = useState<number>(0);    // compounders

  // Auth + Portfolio
  const [userEmail, setUserEmail] = useState<string | null>(null);
  type Holding = { id: string; symbol: string; shares: number; avg_cost: number | null };
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");
  const [holdingError, setHoldingError] = useState<string | null>(null);
  const [symbolSearch, setSymbolSearch] = useState("");
  const [symDropOpen, setSymDropOpen] = useState(false);
  const [latestPrices, setLatestPrices] = useState<Record<string, { price: number; date: string }>>({});
  const dataDate = Object.values(latestPrices).map((v) => v.date).sort().at(-1) ?? null;

  // Detalle + gráfico
  const [selected, setSelected] = useState<RankRow | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [rangeKey, setRangeKey] = useState<string>("3M");

  // Finnhub
  const [finnhubData, setFinnhubData] = useState<{
    news: { headline: string; url: string; source: string; datetime: number }[];
    recommendation: { buy: number; hold: number; sell: number; strongBuy: number; strongSell: number; period: string } | null;
    quote: { c: number; h: number; l: number; o: number; pc: number; dp: number } | null;
    metrics: {
      marketCapitalization: number | null;
      peBasicExclExtraTTM: number | null;
      ebitdaAnnual: number | null;
      dividendYieldIndicatedAnnual: number | null;
      revenueGrowthTTMYoy: number | null;
      epsBasicExclExtraItemsTTM: number | null;
      '52WeekHigh': number | null;
      '52WeekLow': number | null;
    } | null;
  } | null>(null);
  const [finnhubLoading, setFinnhubLoading] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (!selected?.symbol) { setFinnhubData(null); return; }
    setFinnhubLoading(true);
    getFinnhubData(selected.symbol)
      .then(setFinnhubData)
      .catch(() => setFinnhubData(null))
      .finally(() => setFinnhubLoading(false));
  }, [selected?.symbol]);

  // Avatar dropdown + edit profile
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editAgeRange, setEditAgeRange] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [editRiskTolerance, setEditRiskTolerance] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // ---------- Loaders ----------
  async function loadRanking() {
    setLoading(true);
    setError(null);
    try {
      const list = (await getRanking()) as RankRow[];
      setRows(list);
      if (!selected && list.length) setSelected(list[0]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadTurnarounds() {
    setLoading(true);
    setError(null);
    try {
      setTurnRows((await getTurnarounds()) as TurnRow[]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadAccumulation() {
    setLoading(true);
    setError(null);
    try {
      setAccumRows((await getAccumulationZone()) as AccumRow[]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCompounders(h: "1Y" | "3Y" | "5Y") {
    setLoading(true);
    setError(null);
    try {
      setCompoundRows((await getCompounders(h)) as CompoundRow[]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPrices(sym: string, days: number) {
    setPrices([]);
    setPricesLoading(true);
    setError(null);
    try {
      setPrices((await getPrices(sym, days)) as PriceRow[]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setPricesLoading(false);
    }
  }

  // ---------- Auth ----------
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata ?? {};
      setUserEmail(data.user?.email ?? null);
      const fn = meta.first_name ?? "";
      const ln = meta.last_name ?? "";
      const fullName = meta.full_name ?? (fn || ln ? `${fn} ${ln}`.trim() : null);
      setUserDisplayName(fullName);
    });
  }, []);

  async function loadHoldings() {
    setHoldingsLoading(true);
    const supabase = createClient();
    const { data: port } = await supabase
      .from("portfolios")
      .select("id")
      .limit(1)
      .single();
    if (!port) {
      setHoldings([]);
      setHoldingsLoading(false);
      return;
    }
    const { data } = await supabase
      .from("portfolio_assets")
      .select("id, symbol, shares, avg_cost")
      .eq("portfolio_id", port.id)
      .order("symbol");
    const list = (data ?? []) as Holding[];
    setHoldings(list);
    if (list.length) {
      const prices = await getLatestPrices(list.map((h) => h.symbol));
      setLatestPrices(prices);
    } else {
      setLatestPrices({});
    }
    setHoldingsLoading(false);
  }

  function closeAddModal() {
    setShowAddHolding(false);
    setNewSymbol(""); setNewShares(""); setNewAvgCost("");
    setSymbolSearch(""); setSymDropOpen(false);
    setHoldingError(null);
  }

  async function addHolding() {
    setHoldingError(null);
    if (!newSymbol.trim()) { setHoldingError("Symbol required"); return; }
    const sharesNum = parseFloat(newShares);
    if (isNaN(sharesNum) || sharesNum <= 0) { setHoldingError("Shares must be > 0"); return; }
    const supabase = createClient();
    // get or create portfolio
    let portId: string;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHoldingError("Not authenticated"); return; }
    const { data: existing } = await supabase.from("portfolios").select("id").limit(1).single();
    if (existing) {
      portId = existing.id;
    } else {
      const { data: created, error } = await supabase.from("portfolios").insert({ name: "My Portfolio", user_id: user.id }).select("id").single();
      if (error || !created) { setHoldingError(error?.message ?? "Could not create portfolio"); return; }
      portId = created.id;
    }
    const { error } = await supabase.from("portfolio_assets").upsert({
      portfolio_id: portId,
      symbol: newSymbol.trim().toUpperCase(),
      shares: sharesNum,
      avg_cost: newAvgCost ? parseFloat(newAvgCost) : null,
    }, { onConflict: "portfolio_id,symbol" });
    if (error) { setHoldingError(error.message); return; }
    closeAddModal();
    loadHoldings();
  }

  async function removeHolding(id: string) {
    const supabase = createClient();
    await supabase.from("portfolio_assets").delete().eq("id", id);
    loadHoldings();
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function saveDisplayName() {
    setEditSaving(true);
    const supabase = createClient();
    const fullName = `${editName.trim()} ${editLastName.trim()}`.trim() || editName.trim();
    const { data } = await supabase.auth.updateUser({
      data: {
        first_name: editName.trim(),
        last_name: editLastName.trim(),
        full_name: fullName,
        age_range: editAgeRange,
        experience: editExperience,
        risk_tolerance: editRiskTolerance,
      },
    });
    if (data.user) setUserDisplayName(fullName || null);
    setEditSaving(false);
    setShowEditProfile(false);
  }

  // Close user menu on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    function handle(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showUserMenu]);

  // ---------- Effects ----------
  // Tab persistence via URL hash — read on mount (always set, default ranking), write on change
  useEffect(() => {
    const hash = window.location.hash.slice(1) as ViewMode;
    const valid: ViewMode[] = ["overview", "ranking", "turnarounds", "accumulation", "compounders", "portfolio"];
    setViewMode(valid.includes(hash) ? hash : "overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewMode) window.location.hash = viewMode;
  }, [viewMode]);



  // recarga precios al cambiar símbolo o rango
  useEffect(() => {
    if (!selected) return;
    const cfg = RANGE_OPTIONS.find((x) => x.key === rangeKey) || RANGE_OPTIONS[2];
    loadPrices(selected.symbol, cfg.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.symbol, rangeKey]);

  // cambiar pestaña
  useEffect(() => {
    if (viewMode === "overview") { loadRanking(); loadTurnarounds(); loadCompounders(cmpHorizon); }
    if (viewMode === "ranking") loadRanking();
    if (viewMode === "turnarounds") loadTurnarounds();
    if (viewMode === "accumulation") loadAccumulation();
    if (viewMode === "compounders") loadCompounders(cmpHorizon);
    if (viewMode === "portfolio") loadHoldings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // cambiar horizonte compounders
  useEffect(() => {
    if (viewMode === "compounders") loadCompounders(cmpHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmpHorizon]);

  // ---------- Derivados ----------
  const filteredRanking = useMemo(() => {
    if (viewMode !== "ranking") return rows;
    let r = rows.slice();
    if (q) {
      const qq = q.toLowerCase();
      r = r.filter(
        (x) =>
          x.symbol.toLowerCase().includes(qq) ||
          (x.name ?? "").toLowerCase().includes(qq)
      );
    }
    if (bucket) r = r.filter((x) => (x.bucket ?? "") === bucket);
    if (atype) r = r.filter((x) => (x.asset_type ?? "") === atype);
    if (minScore > 0) r = r.filter((x) => (x.final_score ?? -1) >= minScore);
    r.sort((a, b) => {
      const va = (a[sortKey] as any) ?? -Infinity;
      const vb = (b[sortKey] as any) ?? -Infinity;
      const cmp = va > vb ? 1 : va < vb ? -1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [rows, q, bucket, atype, minScore, sortKey, sortDir, viewMode]);

  // Reset todas las páginas al cambiar de pestaña
  useEffect(() => { setPage(0); setTurnPage(0); setAccumPage(0); setCmpPage(0); }, [viewMode]);
  // Reset página ranking al cambiar filtros
  useEffect(() => { setPage(0); }, [q, bucket, atype, minScore, sortKey, sortDir]);
  // Reset página compounders al cambiar filtros
  useEffect(() => { setCmpPage(0); }, [cagrMin, posMonthsMin, maxDDMax, cmpHorizon]);

  const totalPages = Math.max(1, Math.ceil(filteredRanking.length / pageSize));
  const pagedRanking = filteredRanking.slice(page * pageSize, (page + 1) * pageSize);

  const totalTurnPages = Math.max(1, Math.ceil(turnRows.length / pageSize));
  const pagedTurnRows = turnRows.slice(turnPage * pageSize, (turnPage + 1) * pageSize);

  const totalAccumPages = Math.max(1, Math.ceil(accumRows.length / pageSize));
  const pagedAccumRows = accumRows.slice(accumPage * pageSize, (accumPage + 1) * pageSize);

  const filteredCompounders = useMemo(() => {
    if (viewMode !== "compounders") return compoundRows;
    const getCAGR = (r: CompoundRow) =>
      cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;

    return compoundRows
      .filter((r) => {
        const cagr = getCAGR(r);
        const pos = r.pos_month_ratio;
        const mdd = r.max_drawdown;
        const passCAGR = cagr != null ? cagr >= cagrMin : false;
        const passPos = pos != null ? pos >= posMonthsMin : false;
        const passMDD = mdd != null ? mdd >= maxDDMax : false; // mdd es negativo
        return passCAGR && passPos && passMDD;
      })
      .sort((a, b) => {
        const aC = getCAGR(a) ?? -Infinity;
        const bC = getCAGR(b) ?? -Infinity;
        return bC - aC;
      });
  }, [compoundRows, cmpHorizon, cagrMin, posMonthsMin, maxDDMax, viewMode]);

  const totalCmpPages = Math.max(1, Math.ceil(filteredCompounders.length / pageSize));
  const pagedCompounders = filteredCompounders.slice(cmpPage * pageSize, (cmpPage + 1) * pageSize);

  // ---------- Handlers ----------
  function handleOpen(row: RankRow) {
    setSelected(row);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openFromSymbol(
    sym: string,
    name?: string | null,
    asset_type?: string | null,
    racional_url?: string | null,
    extras?: Partial<RankRow>,
  ) {
    const base: RankRow = {
      symbol: sym,
      name: name ?? null,
      asset_type: asset_type ?? null,
      racional_url: racional_url ?? null,
      date: new Date().toISOString().slice(0, 10),
      final_score: null,
      bucket: null,
      mom_1w: null,
      mom_1m: null,
      mom_3m: null,
      mom_6m: null,
      mom_1y: null,
      rs_spy: null,
      tech_trend: null,
      liq_score: null,
      ...extras,
    };
    handleOpen(base);
  }

  // =================== UI ===================
  if (!viewMode) return null;
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      {/* Legend Modal */}
      {showLegend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowLegend(false)}
        >
          {/* outer shell: clips border-radius, no overflow */}
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* sticky header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
              <h2 className="text-lg font-bold">{t("legendTitle", lang)}</h2>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
              >
                &times;
              </button>
            </div>
            {/* scrollable body */}
            <div className="overflow-y-auto px-6 pb-2">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {([
                  ["lgPosTitle",    "lgPosDesc"],
                  ["lgRebTitle",    "lgRebDesc"],
                  ["lgBucketTitle", "lgBucketDesc"],
                  ["lgCagrTitle",   "lgCagrDesc"],
                  ["lgLiqTitle",    "lgLiqDesc"],
                  ["lgMddTitle",    "lgMddDesc"],
                  ["lgMomTitle",    "lgMomDesc"],
                  ["lgRsTitle",     "lgRsDesc"],
                  ["lgScoreTitle",  "lgScoreDesc"],
                  ["lgTrendTitle",  "lgTrendDesc"],
                  ["lgVolTitle",    "lgVolDesc"],
                ] as Array<[keyof typeof LABELS, keyof typeof LABELS]>).map(([titleKey, descKey], i, arr) => (
                  <div key={titleKey} className={`border rounded-xl p-3${i === arr.length - 1 && arr.length % 2 !== 0 ? " col-span-2" : ""}`}>
                    <dt className="font-semibold text-gray-900 mb-0.5">{t(titleKey, lang)}</dt>
                    <dd className="text-gray-600 leading-snug text-xs">{t(descKey, lang)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {/* sticky footer button */}
            <div className="px-6 py-4 shrink-0">
              <button
                onClick={() => setShowLegend(false)}
                className="w-full rounded-xl py-2 bg-black text-white text-sm hover:opacity-90"
              >
                {t("legendClose", lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Holding Modal — hoisted to top level so fixed overlay covers full viewport */}
      {showAddHolding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAddModal}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="font-bold text-base">{t("portAddHolding", lang)}</h2>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 pb-6 flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder={`${t("portSymbol", lang)} — search…`}
                  value={symbolSearch}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setSymbolSearch(v);
                    setNewSymbol(v);
                    setSymDropOpen(true);
                  }}
                  onFocus={() => setSymDropOpen(true)}
                  onBlur={() => setTimeout(() => setSymDropOpen(false), 150)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black uppercase"
                />
                {symDropOpen && symbolSearch.length > 0 &&
                  rows.filter((r) => {
                    const q = symbolSearch.toLowerCase();
                    return r.symbol.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
                  }).length > 0 && (
                  <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {rows
                      .filter((r) => {
                        const q = symbolSearch.toLowerCase();
                        return r.symbol.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
                      })
                      .slice(0, 8)
                      .map((r) => (
                        <li
                          key={r.symbol}
                          onMouseDown={() => {
                            setNewSymbol(r.symbol);
                            setSymbolSearch(r.symbol);
                            setSymDropOpen(false);
                          }}
                          className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-100 first:rounded-t-xl last:rounded-b-xl"
                        >
                          <span className="font-mono font-semibold w-16 shrink-0 text-xs">{r.symbol}</span>
                          <span className="text-gray-500 truncate text-xs">{r.name}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              <input
                type="number"
                placeholder={t("portShares", lang)}
                min="0"
                step="any"
                value={newShares}
                onChange={(e) => setNewShares(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              />
              <input
                type="number"
                placeholder={`${t("portAvgCost", lang)} (optional)`}
                min="0"
                step="any"
                value={newAvgCost}
                onChange={(e) => setNewAvgCost(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
              />
              {holdingError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{holdingError}</p>
              )}
              <div className="flex gap-2 pt-1">
                <button onClick={closeAddModal} className="flex-1 rounded-xl py-2 border text-sm hover:bg-gray-50">
                  {t("portCancel", lang)}
                </button>
                <button onClick={addHolding} className="flex-1 rounded-xl py-2 bg-black text-white text-sm hover:opacity-90">
                  {t("portSave", lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h2 className="font-bold text-base">{t("editProfile", lang)}</h2>
              <button onClick={() => setShowEditProfile(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="px-6 pb-6 flex flex-col gap-3 overflow-y-auto max-h-[70vh]">
              <div className="text-xs text-gray-500 pb-1 border-b">{userEmail}</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder={lang === "es" ? "Nombre" : "First name"}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                />
                <input
                  type="text"
                  placeholder={lang === "es" ? "Apellido" : "Last name"}
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <select value={editAgeRange} onChange={(e) => setEditAgeRange(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black">
                <option value="">{lang === "es" ? "Rango de edad" : "Age range"}</option>
                <option value="18-25">18 – 25</option>
                <option value="26-35">26 – 35</option>
                <option value="36-45">36 – 45</option>
                <option value="46-55">46 – 55</option>
                <option value="55+">55+</option>
              </select>
              <select value={editExperience} onChange={(e) => setEditExperience(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black">
                <option value="">{lang === "es" ? "Experiencia inversora" : "Investment experience"}</option>
                <option value="beginner">{lang === "es" ? "Principiante" : "Beginner"}</option>
                <option value="intermediate">{lang === "es" ? "Intermedio" : "Intermediate"}</option>
                <option value="advanced">{lang === "es" ? "Avanzado" : "Advanced"}</option>
              </select>
              <select value={editRiskTolerance} onChange={(e) => setEditRiskTolerance(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black">
                <option value="">{lang === "es" ? "Tolerancia al riesgo" : "Risk tolerance"}</option>
                <option value="conservative">{lang === "es" ? "Conservador" : "Conservative"}</option>
                <option value="moderate">{lang === "es" ? "Moderado" : "Moderate"}</option>
                <option value="aggressive">{lang === "es" ? "Agresivo" : "Aggressive"}</option>
              </select>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowEditProfile(false)} className="flex-1 rounded-xl py-2 border text-sm hover:bg-gray-50">
                  {t("editCancel", lang)}
                </button>
                <button onClick={saveDisplayName} disabled={editSaving} className="flex-1 rounded-xl py-2 bg-black text-white text-sm hover:opacity-90 disabled:opacity-50">
                  {editSaving ? "…" : t("editSave", lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/85 backdrop-blur border-b dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            <SlidingTabBar viewMode={viewMode} setViewMode={setViewMode} lang={lang} />
          </div>
          <div className="flex items-center gap-2">
            <LangToggle lang={lang} setLang={setLang} />
            <button
              onClick={() => setShowLegend(true)}
              title={t("legendTitle", lang)}
              className="w-8 h-8 rounded-lg border dark:border-neutral-600 text-sm font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200 flex items-center justify-center"
            >
              ?
            </button>
            <ThemeToggle />
            <button
              onClick={() => {
                if (viewMode === "overview") { loadRanking(); loadTurnarounds(); loadCompounders(cmpHorizon); }
                else if (viewMode === "ranking") loadRanking();
                else if (viewMode === "turnarounds") loadTurnarounds();
                else loadCompounders(cmpHorizon);
              }}
              title={t("reloadBtn", lang)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border dark:border-neutral-600 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors duration-200"
            >
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                className={loading ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>
            {userEmail && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-sm font-bold hover:opacity-75 transition-opacity flex-none"
                  aria-label="User menu"
                >
                  {(userDisplayName || userEmail).charAt(0).toUpperCase()}
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeInDown">
                    <div className="px-4 py-3 border-b dark:border-neutral-700">
                      {userDisplayName && <div className="font-semibold text-sm truncate">{userDisplayName}</div>}
                      <div className="text-xs text-gray-500 truncate">{userEmail}</div>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => {
          setShowUserMenu(false);
          const supabase = createClient();
          supabase.auth.getUser().then(({ data }) => {
            const meta = data.user?.user_metadata ?? {};
            setEditName(meta.first_name ?? "");
            setEditLastName(meta.last_name ?? "");
            setEditAgeRange(meta.age_range ?? "");
            setEditExperience(meta.experience ?? "");
            setEditRiskTolerance(meta.risk_tolerance ?? "");
            setShowEditProfile(true);
          });
        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                      >
                        <span>✏️</span> {t("editProfile", lang)}
                      </button>
                      <button
                        onClick={signOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        {t("portLogout", lang)}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm">
            Error: {error}
          </div>
        )}

        {/* Panel superior: gráfico + señales */}
        <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── LEFT: chart + fundamentals strip ── */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Chart card */}
            <div className="bg-white border rounded-2xl p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="flex items-center gap-3">
                  {selected && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                      <img
                        src={logoSrc(selected.symbol)}
                        alt={`${selected.name ?? selected.symbol} logo`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">
                      {selected ? (
                        <>{selected.symbol} — {selected.name}</>
                      ) : (
                        t("selectSymbol", lang)
                      )}
                    </h2>
                    {selected && finnhubData?.quote && (
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-bold">{finnhubData.quote.c.toFixed(2)}</span>
                        <span className={`text-sm font-medium ${finnhubData.quote.dp >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {finnhubData.quote.dp >= 0 ? "+" : ""}{finnhubData.quote.dp.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* range buttons */}
                <div className="flex gap-1 flex-wrap">
                  {RANGE_OPTIONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRangeKey(r.key)}
                      className={`px-2 py-1 text-xs rounded-lg border transition-colors duration-200 ${
                        rangeKey === r.key ? "bg-black text-white dark:bg-white dark:text-black" : "bg-white hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-gray-300 dark:border-neutral-600"
                      }`}
                    >
                      {r.key}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 h-52 md:h-64">
                {!selected ? (
                  <div className="h-full flex items-center justify-center text-gray-500">{t("pickSymbol", lang)}</div>
                ) : pricesLoading ? (
                  <div className="h-full flex items-center justify-center text-gray-500">{t("loadingPrices", lang)}</div>
                ) : prices.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={prices} margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={28} tickMargin={6} />
                      <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} width={60} tickMargin={4} />
                      <Tooltip
                        contentStyle={{ fontSize: "12px", borderRadius: "8px", padding: "6px 10px" }}
                        formatter={(v: any) => Number(v).toFixed(2)}
                      />
                      <Line type="monotone" dataKey="close" dot={false} strokeWidth={2} stroke="#2563eb" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">{t("noPriceData", lang)}</div>
                )}
              </div>
            </div>

            {/* Fundamentals + (Consensus & About) — 2-column inner grid */}
            {selected && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* LEFT: Fundamentals */}
                <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("fundamentals", lang)}</div>
                  {finnhubLoading ? (
                    <div className="text-xs text-gray-400 animate-pulse">Loading…</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      {finnhubData?.quote && (<>
                        <FundStat label={t("prevClose", lang)} value={finnhubData.quote.pc.toFixed(2)} />
                        <FundStat label={t("dayOpen", lang)} value={finnhubData.quote.o.toFixed(2)} />
                        <FundStat label={t("dayHigh", lang)} value={finnhubData.quote.h.toFixed(2)} highlight="up" />
                        <FundStat label={t("dayLow", lang)} value={finnhubData.quote.l.toFixed(2)} highlight="down" />
                      </>)}
                      {finnhubData?.metrics && (<>
                        <FundStat label={t("week52High", lang)} value={finnhubData.metrics["52WeekHigh"] != null ? String(finnhubData.metrics["52WeekHigh"]!.toFixed(2)) : "—"} />
                        <FundStat label={t("week52Low", lang)} value={finnhubData.metrics["52WeekLow"] != null ? String(finnhubData.metrics["52WeekLow"]!.toFixed(2)) : "—"} />
                        <FundStat label={t("marketCap", lang)} value={finnhubData.metrics.marketCapitalization != null ? fmtBig(finnhubData.metrics.marketCapitalization) : "—"} />
                        <FundStat label={t("peRatio", lang)} value={finnhubData.metrics.peBasicExclExtraTTM != null ? finnhubData.metrics.peBasicExclExtraTTM.toFixed(1) : "—"} />
                        <FundStat label={t("ebitda", lang)} value={finnhubData.metrics.ebitdaAnnual != null ? fmtBig(finnhubData.metrics.ebitdaAnnual) : "—"} />
                        <FundStat label={t("eps", lang)} value={finnhubData.metrics.epsBasicExclExtraItemsTTM != null ? finnhubData.metrics.epsBasicExclExtraItemsTTM.toFixed(2) : "—"} />
                        <FundStat label={t("divYield", lang)} value={finnhubData.metrics.dividendYieldIndicatedAnnual != null ? finnhubData.metrics.dividendYieldIndicatedAnnual.toFixed(2) + "%" : "—"} />
                        <FundStat label={t("revenueGrowth", lang)} value={finnhubData.metrics.revenueGrowthTTMYoy != null ? finnhubData.metrics.revenueGrowthTTMYoy.toFixed(1) + "%" : "—"} />
                      </>)}
                    </div>
                  )}
                </div>

                {/* RIGHT: Analyst Consensus + About stacked */}
                <div className="flex flex-col gap-4">

                  {/* Analyst Consensus */}
                  <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{t("analystConsensus", lang)}</div>
                    {finnhubLoading ? (
                      <div className="text-xs text-gray-400 animate-pulse">Loading…</div>
                    ) : finnhubData?.recommendation ? (
                      (() => {
                        const r = finnhubData.recommendation;
                        const slices = [
                          { name: t("strongBuy", lang),  value: r.strongBuy,  color: "#10b981" },
                          { name: "Buy",                  value: r.buy,        color: "#4ade80" },
                          { name: "Hold",                 value: r.hold,       color: "#fde047" },
                          { name: "Sell",                 value: r.sell,       color: "#f87171" },
                          { name: t("strongSell", lang),  value: r.strongSell, color: "#ef4444" },
                        ].filter((s) => s.value > 0);
                        const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
                        return (
                          <div className="flex items-center gap-3 w-fit">
                            <div className="flex-none" style={{ width: 120, height: 120 }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={slices}
                                    cx="50%" cy="50%"
                                    innerRadius={35} outerRadius={54}
                                    dataKey="value"
                                    paddingAngle={2}
                                  >
                                    {slices.map((entry, i) => (
                                      <Cell key={i} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ fontSize: "12px", borderRadius: "8px", padding: "4px 10px" }}
                                    formatter={(v: any, name: any) => [`${v} (${((v / total) * 100).toFixed(0)}%)`, name]}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-1.5 text-xs">
                              {slices.map((s, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: s.color }} />
                                  <span className="text-gray-600 w-28">{s.name}</span>
                                  <span className="font-semibold tabular-nums w-5 text-right">{s.value}</span>
                                  <span className="text-gray-400 w-8 text-right tabular-nums">{((s.value / total) * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                              <div className="text-gray-400 mt-1 text-xs">{r.period}</div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-xs text-gray-400">—</div>
                    )}
                  </div>

                  {/* About / Description */}
                  {selected.description ? (
                    <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("companyDescription", lang)}</div>
                      <DescriptionBlock text={selected.description} lang={lang} />
                    </div>
                  ) : (
                    <div className="bg-white border rounded-2xl p-4 dark:bg-neutral-900 dark:border-neutral-700">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("companyDescription", lang)}</div>
                      <div className="text-xs text-gray-400">—</div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: signals panel ── */}
          <div className="flex flex-col gap-4">

            {/* Company header + links */}
            <div className="bg-white border rounded-2xl p-4">
              {selected ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                      <img src={logoSrc(selected.symbol)} alt={selected.symbol} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{selected.symbol} — {selected.name ?? "—"}</div>
                      {(selected.sector || selected.industry) && (
                        <div className="text-xs text-gray-500 truncate">{[selected.sector, selected.industry].filter(Boolean).join(" · ")}</div>
                      )}
                      {selected.website && (
                        <a href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`} target="_blank" className="text-xs text-blue-600 hover:underline">
                          {selected.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selected.symbol)}`} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-600">
                      {t("viewInTradingView", lang)}
                    </a>
                    {selected.racional_url && (
                      <a href={selected.racional_url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-600">
                        {t("viewInRacional", lang)}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">—</div>
              )}
            </div>

            {/* Momentum & technicals */}
            {selected && (
              <div className="bg-white border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t("momentum", lang)}</div>
                  <div className="flex items-center gap-2">
                    {selected.bucket && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selected.bucket === "Alta Convicción" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : selected.bucket === "Vigilancia" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                      }`}>{bucketDisplay(selected.bucket, lang)}</span>
                    )}
                    {selected.final_score != null && (
                      <span className="text-xs font-bold tabular-nums">{selected.final_score.toFixed(3)}</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <MomStat label="Mom 1w" value={selected.mom_1w} />
                  <MomStat label="Mom 1m" value={selected.mom_1m} />
                  <MomStat label="Mom 3m" value={selected.mom_3m} />
                  <MomStat label="Mom 6m" value={selected.mom_6m} />
                  <MomStat label="Mom 1y" value={selected.mom_1y} />
                  <MomStat label="RS vs SPY" value={selected.rs_spy} />
                  <div className="col-span-2 border-t mt-1 pt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                    <div><span className="text-gray-500">{t("liquidity", lang)}: </span><span className="font-medium">{selected.liq_score?.toFixed(2) ?? "—"}</span></div>
                    <div><span className="text-gray-500">{t("trend", lang)}: </span><span className="font-medium">{selected.tech_trend?.toFixed(2) ?? "—"}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Latest news */}
            {selected && (
              <div className="bg-white border rounded-2xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t("latestNews", lang)}</div>
                {finnhubLoading ? (
                  <div className="text-xs text-gray-400 animate-pulse">Loading…</div>
                ) : finnhubData?.news && finnhubData.news.length > 0 ? (
                  <ul className="space-y-3">
                    {finnhubData.news.map((item, i) => (
                      <li key={i} className="border-b last:border-0 pb-2 last:pb-0">
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline line-clamp-2 leading-snug dark:text-blue-400">
                          {item.headline}
                        </a>
                        <div className="text-xs text-gray-400 mt-0.5">{item.source} · {new Date(item.datetime * 1000).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-400">—</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ======= Contenido por pestaña ======= */}

        {/* Overview */}
        {viewMode === "overview" && (
          <div className="animate-fadeIn">
            <InfoBox text={t("infoOverviewText", lang)} label={t("infoHowItWorks", lang)} />
            <div className="mb-4">
              <h2 className="text-lg font-bold">{t("tabOverview", lang)}</h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "long" })}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Top Ranking */}
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50 dark:bg-blue-950/40">
                  <span className="font-semibold text-blue-900 dark:text-blue-300">{t("topRanking", lang)}</span>
                  <button onClick={() => setViewMode("ranking")} className="text-xs text-blue-600 hover:underline">
                    {t("seeAll", lang)}
                  </button>
                </div>
                <div className="divide-y">
                  {rows.slice(0, 5).map((r) => (
                    <button key={r.symbol} onClick={() => handleOpen(r)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{r.symbol}</div>
                        <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono tabular-nums">{r.final_score?.toFixed(3) ?? "\u2014"}</div>
                        {r.bucket && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${bucketColor(r.bucket)}`}>
                            {bucketDisplay(r.bucket, lang)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {rows.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
                  )}
                </div>
              </div>

              {/* Top Turnarounds */}
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50 dark:bg-amber-950/40">
                  <span className="font-semibold text-amber-900 dark:text-amber-300">{t("topTurnarounds", lang)}</span>
                  <button onClick={() => setViewMode("turnarounds")} className="text-xs text-amber-600 hover:underline">
                    {t("seeAll", lang)}
                  </button>
                </div>
                <div className="divide-y">
                  {turnRows.slice(0, 5).map((r) => (
                    <button key={r.symbol}
                      onClick={() => openFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url, { mom_1m: r.mom_1m, mom_3m: r.mom_3m, liq_score: r.liq_score })}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{r.symbol}</div>
                        <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-mono tabular-nums text-green-700">
                          {r.rebound_from_low != null ? "\u2191" + (r.rebound_from_low * 100).toFixed(0) + "%" : "\u2014"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.mom_1m != null ? (r.mom_1m * 100).toFixed(1) + "% 1m" : "\u2014"}
                        </div>
                      </div>
                    </button>
                  ))}
                  {turnRows.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
                  )}
                </div>
              </div>

              {/* Top Compounders */}
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-green-50 dark:bg-green-950/40">
                  <span className="font-semibold text-green-900 dark:text-green-300">{t("topCompounders", lang)}</span>
                  <button onClick={() => setViewMode("compounders")} className="text-xs text-green-600 hover:underline">
                    {t("seeAll", lang)}
                  </button>
                </div>
                <div className="divide-y">
                  {filteredCompounders.slice(0, 5).map((r) => {
                    const cagr = cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
                    return (
                      <button key={r.symbol}
                        onClick={() => openFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left">
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{r.symbol}</div>
                          <div className="text-xs text-gray-500 truncate">{r.name ?? "\u2014"}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono tabular-nums text-green-700">
                            {cagr != null ? (cagr * 100).toFixed(1) + "% CAGR" : "\u2014"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {r.pos_month_ratio != null ? (r.pos_month_ratio * 100).toFixed(0) + "% pos" : "\u2014"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {compoundRows.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">{t("loadingBtn", lang)}</div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Ranking */}
        {viewMode === "ranking" && (
          <div className="animate-fadeIn">
            <InfoBox text={t("infoRankingText", lang)} label={t("infoHowItWorks", lang)} />
            <section className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                placeholder={t("searchPlaceholder", lang)}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm md:col-span-2"
              />
              <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                <option value="">{t("bucketAll", lang)}</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {bucketDisplay(b, lang)}
                  </option>
                ))}
              </select>
              <select value={atype} onChange={(e) => setAtype(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                <option value="">{t("typeAll", lang)}</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <label className="text-sm w-20">{t("minScore", lang)}</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={minScore}
                  onChange={(e) => setMinScore(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm tabular-nums w-12 text-right">{minScore.toFixed(2)}</span>
              </div>
            </section>

            <section className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-gray-600">{t("sortBy", lang)}</span>
              <select
                value={String(sortKey)}
                onChange={(e) => setSortKey(e.target.value as keyof RankRow)}
                className="border rounded-lg px-2 py-1"
              >
                <option value="final_score">Score</option>
                <option value="mom_1m">Mom 1m</option>
                <option value="mom_1w">Mom 1w</option>
                <option value="mom_3m">Mom 3m</option>
                <option value="rs_spy">RS vs SPY</option>
                <option value="liq_score">{t("liquidity", lang)}</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className="border rounded-lg px-2 py-1">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <span className="ml-auto text-gray-500">{filteredRanking.length} {t("results", lang)}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
                className="border rounded-lg px-2 py-1"
              >
                <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
                <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
                <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
              </select>
            </section>

            <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2">{t("symbol", lang)}</th>
                    <th className="px-3 py-2">{t("name", lang)}</th>
                    <th className="px-3 py-2">{t("type", lang)}</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Mom 1m</th>
                    <th className="px-3 py-2 text-right">Mom 3m</th>
                    <th className="px-3 py-2 text-right">Mom 6m</th>
                    <th className="px-3 py-2 text-right">Mom 1y</th>
                    <th className="px-3 py-2 text-right">RS vs SPY</th>
                    <th className="px-3 py-2 text-right">{t("liquidity", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRanking.map((r) => (
                    <tr key={r.symbol} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => handleOpen(r)}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                            <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-semibold">{r.symbol}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.name ?? "—"}</td>
                      <td className="px-3 py-2">{r.asset_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.final_score?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_1m != null ? (r.mom_1m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_3m != null ? (r.mom_3m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_6m != null ? (r.mom_6m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_1y != null ? (r.mom_1y * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.rs_spy != null ? (r.rs_spy * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.liq_score?.toFixed(2) ?? "—"}</td>
                    </tr>
                  ))}
                  {pagedRanking.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                        {t("noResults", lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </section>

            <PaginationBar lang={lang}
              page={page} total={totalPages}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </div>
        )}

        {/* Turnarounds */}
        {viewMode === "turnarounds" && (<div className="animate-fadeIn">
          <InfoBox text={t("infoTurnaroundsText", lang)} label={t("infoHowItWorks", lang)} />
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">{turnRows.length} {t("candidates", lang)}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setTurnPage(0); }}
              className="border rounded-lg px-2 py-1"
            >
              <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
              <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
              <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
            </select>
          </div>
          <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-[620px] w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-2">{t("symbol", lang)}</th>
                  <th className="px-3 py-2">{t("name", lang)}</th>
                  <th className="px-3 py-2">{t("type", lang)}</th>
                  <th className="px-3 py-2 text-right">{t("rebound52w", lang)}</th>
                  <th className="px-3 py-2 text-right">Mom 1m</th>
                  <th className="px-3 py-2 text-right">Mom 3m</th>
                  <th className="px-3 py-2 text-right">Vol surge</th>
                </tr>
              </thead>
              <tbody>
                {pagedTurnRows.map((tr) => (
                  <tr key={tr.symbol} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openFromSymbol(tr.symbol, tr.name, tr.asset_type, tr.racional_url, { mom_1m: tr.mom_1m, mom_3m: tr.mom_3m, liq_score: tr.liq_score })}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img src={logoSrc(tr.symbol)} alt={tr.symbol} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold">{tr.symbol}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">{tr.name ?? "—"}</td>
                    <td className="px-3 py-2">{tr.asset_type ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tr.rebound_from_low != null ? (tr.rebound_from_low * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tr.mom_1m != null ? (tr.mom_1m * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tr.mom_3m != null ? (tr.mom_3m * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{tr.vol_surge != null ? tr.vol_surge.toFixed(2) + "×" : "—"}</td>
                  </tr>
                ))}
                {pagedTurnRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                      {t("noCandidates", lang)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </section>
          <PaginationBar lang={lang}
            page={turnPage} total={totalTurnPages}
            onPrev={() => setTurnPage((p) => Math.max(0, p - 1))}
            onNext={() => setTurnPage((p) => Math.min(totalTurnPages - 1, p + 1))}
          />
        </div>)}

        {/* Accumulation Zone */}
        {viewMode === "accumulation" && (<div className="animate-fadeIn">
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-700/40 dark:text-amber-300">
            {lang === "es"
              ? "Candidatos en zona de acumulación: caídas ≥40% desde máximos, aún cerca del mínimo 52s (0–50% sobre él), con primeros signos de vida (momentum y volumen)."
              : "Accumulation zone candidates: fallen ≥40% from highs, still near 52w low (0–50% above it), with first signs of life (momentum & volume surge)."}
          </div>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-gray-500">{accumRows.length} {t("candidates", lang)}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setAccumPage(0); }}
              className="border rounded-lg px-2 py-1"
            >
              <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
              <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
              <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
            </select>
          </div>
          <section className="bg-white border rounded-2xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:border-neutral-700">
            <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
                <tr>
                  <th className="px-3 py-2">{t("symbol", lang)}</th>
                  <th className="px-3 py-2">{t("name", lang)}</th>
                  <th className="px-3 py-2">{t("type", lang)}</th>
                  <th className="px-3 py-2 text-right">{lang === "es" ? "% sobre mín 52s" : "% above 52w low"}</th>
                  <th className="px-3 py-2 text-right">{lang === "es" ? "Caída desde máx" : "From 52w high"}</th>
                  <th className="px-3 py-2 text-right">Mom 1w</th>
                  <th className="px-3 py-2 text-right">Mom 1m</th>
                  <th className="px-3 py-2 text-right">Vol surge</th>
                </tr>
              </thead>
              <tbody>
                {pagedAccumRows.map((ar) => (
                  <tr key={ar.symbol} className="border-t hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
                    onClick={() => openFromSymbol(ar.symbol, ar.name, ar.asset_type, ar.racional_url, { mom_1m: ar.mom_1m, mom_3m: ar.mom_3m, liq_score: ar.liq_score })}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img src={logoSrc(ar.symbol)} alt={ar.symbol} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-semibold">{ar.symbol}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[180px] truncate">{ar.name ?? "—"}</td>
                    <td className="px-3 py-2">{ar.asset_type ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {ar.pct_above_52w_low != null ? "+" + (ar.pct_above_52w_low * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-500 dark:text-red-400">
                      {ar.pct_from_52w_high != null ? (ar.pct_from_52w_high * 100).toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {ar.mom_1w != null
                        ? <span className={ar.mom_1w >= 0 ? "text-green-600" : "text-red-500"}>{(ar.mom_1w * 100).toFixed(1)}%</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {ar.mom_1m != null
                        ? <span className={ar.mom_1m >= 0 ? "text-green-600" : "text-red-500"}>{(ar.mom_1m * 100).toFixed(1)}%</span>
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{ar.vol_surge != null ? ar.vol_surge.toFixed(2) + "×" : "—"}</td>
                  </tr>
                ))}
                {pagedAccumRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      {t("noCandidates", lang)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </section>
          <PaginationBar lang={lang}
            page={accumPage} total={totalAccumPages}
            onPrev={() => setAccumPage((p) => Math.max(0, p - 1))}
            onNext={() => setAccumPage((p) => Math.min(totalAccumPages - 1, p + 1))}
          />
        </div>)}

        {/* Compounders */}
        {viewMode === "compounders" && (
          <div className="animate-fadeIn">
            <InfoBox text={t("infoCompoundersText", lang)} label={t("infoHowItWorks", lang)} />
            {/* Controles */}
            <section className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t("horizon", lang)}</span>
                <div className="inline-flex rounded-lg overflow-hidden border">
                  {(["1Y", "3Y", "5Y"] as const).map((h) => (
                    <button
                      key={h}
                      onClick={() => setCmpHorizon(h)}
                      className={`px-3 py-1 text-sm ${cmpHorizon === h ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 shrink-0">{t("cagrMin", lang)}</label>
                <input
                  type="number" step="0.01" value={cagrMin}
                  onChange={(e) => setCagrMin(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-20"
                />
                <span className="text-sm text-gray-500">({(cagrMin * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 shrink-0">{t("posMonthsFilter", lang)}</label>
                <input
                  type="number" step="0.01" value={posMonthsMin}
                  onChange={(e) => setPosMonthsMin(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-20"
                />
                <span className="text-sm text-gray-500">({(posMonthsMin * 100).toFixed(0)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 shrink-0">{t("maxDD", lang)}</label>
                <input
                  type="number" step="0.01" value={maxDDMax}
                  onChange={(e) => setMaxDDMax(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-20"
                />
                <span className="text-sm text-gray-500">({(maxDDMax * 100).toFixed(0)}%)</span>
              </div>
            </section>
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">{filteredCompounders.length} {t("results", lang)}</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCmpPage(0); }}
                className="border rounded-lg px-2 py-1"
              >
                <option value={25}>{`25 / ${t("perPage", lang)}`}</option>
                <option value={50}>{`50 / ${t("perPage", lang)}`}</option>
                <option value={100}>{`100 / ${t("perPage", lang)}`}</option>
              </select>
            </div>

            {/* Tabla */}
            <section className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="min-w-[560px] w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2">{t("symbol", lang)}</th>
                    <th className="px-3 py-2">{t("name", lang)}</th>
                    <th className="px-3 py-2 text-right">CAGR</th>
                    <th className="px-3 py-2 text-right">{t("posMonthsCol", lang)}</th>
                    <th className="px-3 py-2 text-right">Max DD</th>
                    <th className="px-3 py-2 text-right">{t("days", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCompounders.map((r) => {
                    const cagr =
                      cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
                    return (
                      <tr key={r.symbol} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => openFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url)}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                              <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                            </div>
                            <span className="font-semibold">{r.symbol}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.name ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {cagr != null ? (cagr * 100).toFixed(1) + "%" : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.pos_month_ratio != null ? (r.pos_month_ratio * 100).toFixed(0) + "%" : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.max_drawdown != null ? (r.max_drawdown * 100).toFixed(0) + "%" : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.days_covered ?? "—"}</td>
                      </tr>
                    );
                  })}
                  {pagedCompounders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                        {t("noResults", lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </section>
            <PaginationBar lang={lang}
              page={cmpPage} total={totalCmpPages}
              onPrev={() => setCmpPage((p) => Math.max(0, p - 1))}
              onNext={() => setCmpPage((p) => Math.min(totalCmpPages - 1, p + 1))}
            />
          </div>
        )}

        {/* ======= Portfolio tab ======= */}
        {viewMode === "portfolio" && (
          <div className="animate-fadeIn">
            <InfoBox text={t("infoPortfolioText", lang)} label={t("infoHowItWorks", lang)} />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{t("tabPortfolio", lang)}</h2>
              <button
                onClick={() => { setShowAddHolding(true); setHoldingError(null); }}
                className="rounded-xl px-4 py-2 bg-black text-white text-sm hover:opacity-90"
              >
                {t("portAddHolding", lang)}
              </button>
            </div>

            {holdingsLoading ? (
              <div className="text-gray-500 text-sm py-8 text-center">{t("portLoading", lang)}</div>
            ) : holdings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-semibold text-gray-700">{t("portEmptyTitle", lang)}</p>
                <p className="text-sm text-gray-500 mt-1 max-w-xs">{t("portEmptyDesc", lang)}</p>
                <button
                  onClick={() => { setShowAddHolding(true); setHoldingError(null); }}
                  className="mt-4 rounded-xl px-5 py-2 bg-black text-white text-sm hover:opacity-90"
                >
                  {t("portAddHolding", lang)}
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3">{t("portSymbol", lang)}</th>
                      <th className="px-4 py-3">{t("portShares", lang)}</th>
                      <th className="px-4 py-3">{t("portAvgCost", lang)}</th>
                      <th className="px-4 py-3">
                        <span>{t("portLastPrice", lang)}</span>
                        {dataDate && (
                          <span className="ml-1 normal-case font-normal text-gray-400">
                            ({dataDate})
                          </span>
                        )}
                      </th>
                      <th className="px-4 py-3">{t("portPnL", lang)}</th>
                      <th className="px-4 py-3">{t("portMarketValue", lang)}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {holdings.map((h) => {
                      const lp = latestPrices[h.symbol];
                      const marketValue = lp ? lp.price * h.shares : null;
                      const pnl =
                        lp && h.avg_cost != null
                          ? (lp.price - h.avg_cost) * h.shares
                          : null;
                      const pnlPct =
                        lp && h.avg_cost != null && h.avg_cost > 0
                          ? ((lp.price - h.avg_cost) / h.avg_cost) * 100
                          : null;
                      return (
                      <tr key={h.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                              <img src={logoSrc(h.symbol)} alt={h.symbol} className="w-full h-full object-cover" />
                            </div>
                            <button
                              className="font-semibold hover:underline"
                              onClick={() => {
                                const match = rows.find((r) => r.symbol === h.symbol);
                                if (match) handleOpen(match);
                                else openFromSymbol(h.symbol);
                              }}
                            >
                              {h.symbol}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{h.shares}</td>
                        <td className="px-4 py-3 tabular-nums">{h.avg_cost != null ? `$${h.avg_cost.toFixed(2)}` : "—"}</td>
                        <td className="px-4 py-3 tabular-nums">
                          {lp ? `$${lp.price.toFixed(2)}` : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {pnl != null ? (
                            <span className={pnl >= 0 ? "text-green-600" : "text-red-500"}>
                              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                              {pnlPct != null && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-medium">
                          {marketValue != null
                            ? `$${marketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeHolding(h.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50"
                          >
                            {t("portDelete", lang)}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        {t("footer", lang)}
      </footer>
    </div>
  );
}

// ====== InfoBox ======
function InfoBox({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{label}</span>
        <span className={`transition-transform duration-200 inline-block ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="mt-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed animate-fadeIn">
          {text}
        </div>
      )}
    </div>
  );
}

// ====== Paginación ======
function PaginationBar({
  page, total, onPrev, onNext, lang,
}: {
  page: number; total: number;
  onPrev: () => void; onNext: () => void;
  lang: Lang;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 text-sm">
      <button onClick={onPrev} disabled={page === 0}
        className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:bg-gray-50">
        {t("prev", lang)}
      </button>
      <span className="text-gray-500">{t("pageLabel", lang)} {page + 1} / {total}</span>
      <button onClick={onNext} disabled={page >= total - 1}
        className="px-3 py-1 rounded-lg border disabled:opacity-40 hover:bg-gray-50">
        {t("next", lang)}
      </button>
    </div>
  );
}

// ====== Descripción ver más/menos ======
function DescriptionBlock({ text, lang }: { text: string; lang: Lang }) {
  const [expanded, setExpanded] = React.useState(false);
  const MAX = 280;
  const short = text.length > MAX ? text.slice(0, MAX) + "\u2026" : text;
  return (
    <div className="text-sm text-gray-700">
      <div className="whitespace-pre-line">{expanded ? text : short}</div>
      {text.length > MAX && (
        <button
          className="mt-1 text-xs text-blue-600 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t("seeLess", lang) : t("seeMore", lang)}
        </button>
      )}
    </div>
  );
}

// ====== Fundamental stat cell ======
function FundStat({ label, value, highlight }: { label: string; value: string; highlight?: "up" | "down" }) {
  return (
    <div>
      <div className="text-xs text-gray-500 leading-none">{label}</div>
      <div className={`text-sm font-semibold tabular-nums mt-0.5 ${highlight === "up" ? "text-emerald-600" : highlight === "down" ? "text-red-500" : ""}`}>
        {value}
      </div>
    </div>
  );
}

// ====== Momentum stat cell ======
function MomStat({ label, value }: { label: string; value: number | null | undefined }) {
  const formatted = value != null ? (value * 100).toFixed(2) + "%" : "—";
  const color = value == null ? "" : value > 0 ? "text-emerald-600" : value < 0 ? "text-red-500" : "text-gray-500";
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={`font-medium tabular-nums ${color}`}>{formatted}</span>
    </div>
  );
}

// ====== Format big numbers (M / B) ======
function fmtBig(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}
