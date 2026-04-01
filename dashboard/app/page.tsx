"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getRanking, getTurnarounds, getCompounders, getPrices, getLatestPrices } from "./actions";
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

type ViewMode = "overview" | "ranking" | "turnarounds" | "compounders" | "portfolio";

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
} as const;

function t(key: keyof typeof LABELS, lang: Lang): string {
  return LABELS[key][lang];
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="inline-flex rounded-xl overflow-hidden border text-sm">
      <button onClick={() => setLang("es")}
        className={`px-2 py-1 ${lang === "es" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}>
        ES
      </button>
      <button onClick={() => setLang("en")}
        className={`px-2 py-1 ${lang === "en" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}>
        EN
      </button>
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
  if (b === "Alta Convicci\u00f3n") return "bg-green-100 text-green-700";
  if (b === "Vigilancia")         return "bg-amber-100 text-amber-700";
  if (b === "Descartar")          return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

// =================== Componente ===================
export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("ranking");

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
  const [lang, setLang] = useState<Lang>("es");
  const [showLegend, setShowLegend] = useState(false);

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
      setUserEmail(data.user?.email ?? null);
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

  // ---------- Effects ----------
  // inicial
  useEffect(() => {
    loadRanking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  useEffect(() => { setPage(0); setTurnPage(0); setCmpPage(0); }, [viewMode]);
  // Reset página ranking al cambiar filtros
  useEffect(() => { setPage(0); }, [q, bucket, atype, minScore, sortKey, sortDir]);
  // Reset página compounders al cambiar filtros
  useEffect(() => { setCmpPage(0); }, [cagrMin, posMonthsMin, maxDDMax, cmpHorizon]);

  const totalPages = Math.max(1, Math.ceil(filteredRanking.length / pageSize));
  const pagedRanking = filteredRanking.slice(page * pageSize, (page + 1) * pageSize);

  const totalTurnPages = Math.max(1, Math.ceil(turnRows.length / pageSize));
  const pagedTurnRows = turnRows.slice(turnPage * pageSize, (turnPage + 1) * pageSize);

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
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Legend Modal */}
      {showLegend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowLegend(false)}
        >
          {/* outer shell: clips border-radius, no overflow */}
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
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

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl overflow-hidden border">
              <button
                onClick={() => setViewMode("overview")}
                className={`px-3 py-1 text-sm ${viewMode === "overview" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                {t("tabOverview", lang)}
              </button>
              <button
                onClick={() => setViewMode("ranking")}
                className={`px-3 py-1 text-sm ${viewMode === "ranking" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                Ranking
              </button>
              <button
                onClick={() => setViewMode("turnarounds")}
                className={`px-3 py-1 text-sm ${viewMode === "turnarounds" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                Turnarounds
              </button>
              <button
                onClick={() => setViewMode("compounders")}
                className={`px-3 py-1 text-sm ${viewMode === "compounders" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                Compounders
              </button>
              <button
                onClick={() => setViewMode("portfolio")}
                className={`px-3 py-1 text-sm ${viewMode === "portfolio" ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`}
              >
                {t("tabPortfolio", lang)}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userEmail && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="hidden sm:inline">{userEmail}</span>
                <button
                  onClick={signOut}
                  title={t("portLogout", lang)}
                  className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-100"
                >
                  {t("portLogout", lang)}
                </button>
              </div>
            )}
            <LangToggle lang={lang} setLang={setLang} />
            <button
              onClick={() => setShowLegend(true)}
              title={t("legendTitle", lang)}
              className="w-8 h-8 rounded-full border text-sm font-bold hover:bg-gray-100 flex items-center justify-center"
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
              className="rounded-xl px-4 py-2 bg-black text-white text-sm shadow hover:opacity-90"
            >
              {loading ? t("loadingBtn", lang) : t("reloadBtn", lang)}
            </button>
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
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chart */}
          <div className="md:col-span-2 bg-white border rounded-2xl p-4">
            <div className="flex items-baseline justify-between">
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
                <h2 className="text-lg font-semibold">
                  {selected ? (
                    <>
                      {selected.symbol} — {selected.name}
                    </>
                  ) : (
                    t("selectSymbol", lang)
                  )}
                </h2>
              </div>
              {/* botones rango */}
              <div className="flex gap-1">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRangeKey(r.key)}
                    className={`px-2 py-1 text-xs rounded-lg border ${
                      rangeKey === r.key ? "bg-black text-white" : "bg-white hover:bg-gray-100"
                    }`}
                  >
                    {r.key}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-64 mt-10 flex items-center justify-center p-4">
              {!selected ? (
                <div className="text-gray-500">{t("pickSymbol", lang)}</div>
              ) : pricesLoading ? (
                <div className="text-gray-500">{t("loadingPrices", lang)}</div>
              ) : prices.length ? (
                <div className="w-full h-full flex items-center justify-center">
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
                </div>
              ) : (
                <div className="text-gray-500">{t("noPriceData", lang)}</div>
              )}
            </div>
          </div>

          {/* Señales */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">{t("signals", lang)}</h3>
            {selected ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                    <img
                      src={logoSrc(selected.symbol)}
                      alt={`${selected.name ?? selected.symbol} logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {selected.symbol} — {selected.name ?? "—"}
                    </div>
                    {selected.website && (
                      <a
                        href={selected.website.startsWith("http") ? selected.website : `https://${selected.website}`}
                        target="_blank"
                        className="text-xs text-blue-600 hover:underline break-all"
                      >
                        {selected.website}
                      </a>
                    )}
                    {(selected.sector || selected.industry) && (
                      <div className="text-xs text-gray-500">
                        {[selected.sector, selected.industry].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>

                <ul className="text-sm space-y-1 mb-3">
                  <li><span className="text-gray-600">Bucket:</span> {selected.bucket ?? "—"}</li>
                  <li><span className="text-gray-600">Score:</span> {selected.final_score?.toFixed(3) ?? "—"}</li>
                  <li><span className="text-gray-600">Mom 1w:</span> {selected.mom_1w!=null ? (selected.mom_1w*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">Mom 1m:</span> {selected.mom_1m!=null ? (selected.mom_1m*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">Mom 3m:</span> {selected.mom_3m!=null ? (selected.mom_3m*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">Mom 6m:</span> {selected.mom_6m!=null ? (selected.mom_6m*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">Mom 1y:</span> {selected.mom_1y!=null ? (selected.mom_1y*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">RS vs SPY:</span> {selected.rs_spy!=null ? (selected.rs_spy*100).toFixed(2)+"%" : "—"}</li>
                  <li><span className="text-gray-600">{t("liquidity", lang)}:</span> {selected.liq_score?.toFixed(2) ?? "\u2014"}</li>
                  <li><span className="text-gray-600">{t("trend", lang)}:</span> {selected.tech_trend?.toFixed(2) ?? "\u2014"}</li>
                  {selected.racional_url && (
                    <li className="pt-2">
                      <a
                        href={selected.racional_url}
                        target="_blank"
                        className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100"
                      >
                        {t("viewInRacional", lang)}
                      </a>
                    </li>
                  )}
                </ul>

                {selected.description && <DescriptionBlock text={selected.description} lang={lang} />}
              </>
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </section>

        {/* ======= Contenido por pestaña ======= */}

        {/* Overview */}
        {viewMode === "overview" && (
          <>
            <div className="mb-4">
              <h2 className="text-lg font-bold">{t("tabOverview", lang)}</h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "long" })}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Top Ranking */}
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50">
                  <span className="font-semibold text-blue-900">{t("topRanking", lang)}</span>
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
                <div className="flex items-center justify-between px-4 py-3 border-b bg-amber-50">
                  <span className="font-semibold text-amber-900">{t("topTurnarounds", lang)}</span>
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
                <div className="flex items-center justify-between px-4 py-3 border-b bg-green-50">
                  <span className="font-semibold text-green-900">{t("topCompounders", lang)}</span>
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
          </>
        )}

        {/* Ranking */}
        {viewMode === "ranking" && (
          <>
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

            <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 w-10"></th>
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
                    <th className="px-3 py-2">{t("action", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRanking.map((r) => (
                    <tr key={r.symbol} className="border-t hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                          <img
                            src={logoSrc(r.symbol)}
                            alt={r.symbol}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold">{r.symbol}</td>
                      <td className="px-3 py-2">{r.name ?? "—"}</td>
                      <td className="px-3 py-2">{r.asset_type ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.final_score?.toFixed(3) ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_1m != null ? (r.mom_1m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_3m != null ? (r.mom_3m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_6m != null ? (r.mom_6m * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.mom_1y != null ? (r.mom_1y * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.rs_spy != null ? (r.rs_spy * 100).toFixed(2) + "%" : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.liq_score?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleOpen(r)} className="px-3 py-1 rounded-lg bg-black text-white text-xs">
                          {t("view", lang)}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pagedRanking.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-6 text-center text-gray-500">
                        {t("noResults", lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>

            <PaginationBar lang={lang}
              page={page} total={totalPages}
              onPrev={() => setPage((p) => Math.max(0, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </>
        )}

        {/* Turnarounds */}
        {viewMode === "turnarounds" && (<>
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
          <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-2 py-2 w-10"></th>
                  <th className="px-3 py-2">{t("symbol", lang)}</th>
                  <th className="px-3 py-2">{t("name", lang)}</th>
                  <th className="px-3 py-2">{t("type", lang)}</th>
                  <th className="px-3 py-2 text-right">{t("rebound52w", lang)}</th>
                  <th className="px-3 py-2 text-right">Mom 1m</th>
                  <th className="px-3 py-2 text-right">Mom 3m</th>
                  <th className="px-3 py-2 text-right">Vol surge</th>
                  <th className="px-3 py-2">{t("action", lang)}</th>
                </tr>
              </thead>
              <tbody>
                {pagedTurnRows.map((t) => (
                  <tr key={t.symbol} className="border-t hover:bg-gray-50">
                    <td className="px-2 py-1">
                      <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                        <img src={logoSrc(t.symbol)} alt={t.symbol} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold">{t.symbol}</td>
                    <td className="px-3 py-2">{t.name ?? "—"}</td>
                    <td className="px-3 py-2">{t.asset_type ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.rebound_from_low != null ? (t.rebound_from_low * 100).toFixed(0) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.mom_1m != null ? (t.mom_1m * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.mom_3m != null ? (t.mom_3m * 100).toFixed(1) + "%" : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{t.vol_surge != null ? t.vol_surge.toFixed(2) + "×" : "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          openFromSymbol(t.symbol, t.name, t.asset_type, t.racional_url, {
                            mom_1m: t.mom_1m,
                            mom_3m: t.mom_3m,
                            liq_score: t.liq_score,
                          })
                        }
                        className="px-3 py-1 rounded-lg bg-black text-white text-xs"
                      >
                        {t("view", lang)}
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedTurnRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                      {t("noCandidates", lang)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <PaginationBar lang={lang}
            page={turnPage} total={totalTurnPages}
            onPrev={() => setTurnPage((p) => Math.max(0, p - 1))}
            onNext={() => setTurnPage((p) => Math.min(totalTurnPages - 1, p + 1))}
          />
        </>)}

        {/* Compounders */}
        {viewMode === "compounders" && (
          <>
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
            <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 w-10"></th>
                    <th className="px-3 py-2">{t("symbol", lang)}</th>
                    <th className="px-3 py-2">{t("name", lang)}</th>
                    <th className="px-3 py-2 text-right">CAGR</th>
                    <th className="px-3 py-2 text-right">{t("posMonthsCol", lang)}</th>
                    <th className="px-3 py-2 text-right">Max DD</th>
                    <th className="px-3 py-2 text-right">{t("days", lang)}</th>
                    <th className="px-3 py-2">{t("action", lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCompounders.map((r) => {
                    const cagr =
                      cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
                    return (
                      <tr key={r.symbol} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-1">
                          <div className="w-7 h-7 rounded-full border border-gray-200 bg-white overflow-hidden flex-none">
                            <img src={logoSrc(r.symbol)} alt={r.symbol} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-3 py-2 font-semibold">{r.symbol}</td>
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
                        <td className="px-3 py-2">
                          <button
                            onClick={() => openFromSymbol(r.symbol, r.name, r.asset_type, r.racional_url)}
                            className="px-3 py-1 rounded-lg bg-black text-white text-xs"
                          >
                            {t("view", lang)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {pagedCompounders.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                        {t("noResults", lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
            <PaginationBar lang={lang}
              page={cmpPage} total={totalCmpPages}
              onPrev={() => setCmpPage((p) => Math.max(0, p - 1))}
              onNext={() => setCmpPage((p) => Math.min(totalCmpPages - 1, p + 1))}
            />
          </>
        )}

        {/* ======= Portfolio tab ======= */}
        {viewMode === "portfolio" && (
          <>
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

            {/* Add Holding Modal */}
            {showAddHolding && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={closeAddModal}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h2 className="font-bold text-base">{t("portAddHolding", lang)}</h2>
                    <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                  </div>
                  <div className="px-6 pb-6 flex flex-col gap-3">
                    {/* Symbol search combobox */}
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
                      <button
                        onClick={closeAddModal}
                        className="flex-1 rounded-xl py-2 border text-sm hover:bg-gray-50"
                      >
                        {t("portCancel", lang)}
                      </button>
                      <button
                        onClick={addHolding}
                        className="flex-1 rounded-xl py-2 bg-black text-white text-sm hover:opacity-90"
                      >
                        {t("portSave", lang)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        {t("footer", lang)}
      </footer>
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
  const MAX = 420;
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
