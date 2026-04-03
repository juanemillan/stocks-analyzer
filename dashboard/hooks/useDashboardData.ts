import { useState, useEffect, useMemo } from "react";
import {
  getRanking,
  getTurnarounds,
  getCompounders,
  getPrices,
  getAccumulationZone,
  getFinnhubData,
} from "@/app/actions";
import { RANGE_OPTIONS } from "@/lib/stockUtils";
import type {
  ViewMode,
  RankRow,
  TurnRow,
  AccumRow,
  CompoundRow,
  PriceRow,
  FinnhubData,
} from "@/app/types";

export function useDashboardData() {
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
  const [cagrMin, setCagrMin] = useState<number>(0.15);
  const [posMonthsMin, setPosMonthsMin] = useState<number>(0.55);
  const [maxDDMax, setMaxDDMax] = useState<number>(-0.4);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(0);
  const [turnPage, setTurnPage] = useState<number>(0);
  const [cmpPage, setCmpPage] = useState<number>(0);

  // Selected + detail
  const [selected, setSelected] = useState<RankRow | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [rangeKey, setRangeKey] = useState<string>("3M");

  // Finnhub
  const [finnhubData, setFinnhubData] = useState<FinnhubData | null>(null);
  const [finnhubLoading, setFinnhubLoading] = useState(false);

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

  // ---------- Effects ----------
  useEffect(() => {
    if (!selected?.symbol) { setFinnhubData(null); return; }
    setFinnhubLoading(true);
    getFinnhubData(selected.symbol)
      .then(setFinnhubData)
      .catch(() => setFinnhubData(null))
      .finally(() => setFinnhubLoading(false));
  }, [selected?.symbol]);

  // Tab persistence via URL hash
  useEffect(() => {
    const hash = window.location.hash.slice(1) as ViewMode;
    const valid: ViewMode[] = ["overview", "ranking", "turnarounds", "accumulation", "compounders", "portfolio"];
    setViewMode(valid.includes(hash) ? hash : "overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewMode) window.location.hash = viewMode;
  }, [viewMode]);

  // Reload prices when symbol or range changes
  useEffect(() => {
    if (!selected) return;
    const cfg = RANGE_OPTIONS.find((x) => x.key === rangeKey) || RANGE_OPTIONS[2];
    loadPrices(selected.symbol, cfg.days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.symbol, rangeKey]);

  // Load data when tab changes ("portfolio" handled by page.tsx)
  useEffect(() => {
    if (viewMode === "overview") { loadRanking(); loadTurnarounds(); loadCompounders(cmpHorizon); }
    if (viewMode === "ranking") loadRanking();
    if (viewMode === "turnarounds") loadTurnarounds();
    if (viewMode === "accumulation") loadAccumulation();
    if (viewMode === "compounders") loadCompounders(cmpHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  useEffect(() => {
    if (viewMode === "compounders") loadCompounders(cmpHorizon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmpHorizon]);

  // Reset pages
  useEffect(() => { setPage(0); setTurnPage(0); setAccumPage(0); setCmpPage(0); }, [viewMode]);
  useEffect(() => { setPage(0); }, [q, bucket, atype, minScore, sortKey, sortDir]);
  useEffect(() => { setCmpPage(0); }, [cagrMin, posMonthsMin, maxDDMax, cmpHorizon]);

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
        const passMDD = mdd != null ? mdd >= maxDDMax : false;
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

  return {
    viewMode, setViewMode,
    rows, turnRows, accumRows, compoundRows,
    q, setQ, bucket, setBucket, atype, setAtype, minScore, setMinScore,
    sortKey, setSortKey, sortDir, setSortDir,
    pageSize, setPageSize, page, setPage,
    turnPage, setTurnPage, accumPage, setAccumPage, cmpPage, setCmpPage,
    cmpHorizon, setCmpHorizon, cagrMin, setCagrMin,
    posMonthsMin, setPosMonthsMin, maxDDMax, setMaxDDMax,
    filteredRanking, pagedRanking, totalPages,
    pagedTurnRows, totalTurnPages,
    pagedAccumRows, totalAccumPages,
    filteredCompounders, pagedCompounders, totalCmpPages,
    selected, setSelected,
    prices, pricesLoading,
    rangeKey, setRangeKey,
    finnhubData, finnhubLoading,
    loading, error,
    handleOpen, openFromSymbol,
    loadRanking, loadTurnarounds, loadCompounders,
  };
}
