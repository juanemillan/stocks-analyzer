"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
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

type ViewMode = "ranking" | "turnarounds" | "compounders";

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

// =================== Componente ===================
export default function Dashboard() {
  const sb = supabase;

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

  // Detalle + gráfico
  const [selected, setSelected] = useState<RankRow | null>(null);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [rangeKey, setRangeKey] = useState<string>("3M");

  // ---------- Loaders ----------
  async function loadRanking() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await sb.rpc("fetch_compounders", { horizon: cmpHorizon, max_rows: 1200 });
      if (error) throw error;
      const list = (data ?? []) as RankRow[];
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
      const { data, error } = await sb.from("v_turnaround_candidates").select("*");
      if (error) throw error;
      setTurnRows((data ?? []) as TurnRow[]);
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
      const view =
        h === "1Y" ? "v_compounders_1y" : h === "3Y" ? "v_compounders_3y" : "v_compounders_5y";
      const { data, error } = await sb.from(view).select("*");
      if (error) throw error;
      setCompoundRows((data ?? []) as CompoundRow[]);
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
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await sb
        .from("prices_daily")
        .select("date, close")
        .eq("symbol", sym)
        .gte("date", since.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      if (error) throw error;
      setPrices((data ?? []) as PriceRow[]);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setPricesLoading(false);
    }
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
    if (viewMode === "ranking") loadRanking();
    if (viewMode === "turnarounds") loadTurnarounds();
    if (viewMode === "compounders") loadCompounders(cmpHorizon);
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

  // ---------- Handlers ----------
  function handleOpen(row: RankRow) {
    setSelected(row);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openFromSymbol(sym: string, name?: string | null, asset_type?: string | null, racional_url?: string | null) {
    // Construye un RankRow mínimo para el panel de arriba
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
    };
    handleOpen(base);
  }

  // =================== UI ===================
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl overflow-hidden border">
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                viewMode === "ranking"
                  ? loadRanking()
                  : viewMode === "turnarounds"
                  ? loadTurnarounds()
                  : loadCompounders(cmpHorizon)
              }
              className="rounded-xl px-4 py-2 bg-black text-white text-sm shadow hover:opacity-90"
            >
              {loading ? "Cargando…" : "Recargar"}
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
                  <img
                    src={
                      selected.logo_url ||
                      `https://logo.clearbit.com/${selected.website ??
                        ((selected.name ? selected.name.split(" ")[0] + ".com" : null) ??
                        selected.symbol.toLowerCase() + ".com")}`
                    }
                    alt={`${selected.name ?? selected.symbol} logo`}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-200 object-contain bg-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://cdn-icons-png.flaticon.com/512/1828/1828778.png";
                    }}
                  />
                )}
                <h2 className="text-lg font-semibold">
                  {selected ? (
                    <>
                      {selected.symbol} — {selected.name}
                    </>
                  ) : (
                    "Selecciona un símbolo"
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
                <div className="text-gray-500">Elige un símbolo para ver el gráfico</div>
              ) : pricesLoading ? (
                <div className="text-gray-500">Cargando precios…</div>
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
                <div className="text-gray-500">Sin datos de precio</div>
              )}
            </div>
          </div>

          {/* Señales */}
          <div className="bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-2">Señales</h3>
            {selected ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={
                      selected.logo_url ||
                      `https://logo.clearbit.com/${((selected.website ?? selected.name?.split(" ")[0] ?? selected.symbol.toLowerCase()) + ".com")}`
                    }
                    alt={`${selected.name ?? selected.symbol} logo`}
                    className="w-12 h-12 rounded-full border border-gray-200 object-contain bg-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://cdn-icons-png.flaticon.com/512/1828/1828778.png";
                    }}
                  />
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
                  <li><span className="text-gray-600">Liquidez:</span> {selected.liq_score?.toFixed(2) ?? "—"}</li>
                  <li><span className="text-gray-600">Tendencia:</span> {selected.tech_trend?.toFixed(2) ?? "—"}</li>
                  {selected.racional_url && (
                    <li className="pt-2">
                      <a
                        href={selected.racional_url}
                        target="_blank"
                        className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100"
                      >
                        Ver en Racional
                      </a>
                    </li>
                  )}
                </ul>

                {selected.description && <DescriptionBlock text={selected.description} />}
              </>
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </section>

        {/* ======= Contenido por pestaña ======= */}

        {/* Ranking */}
        {viewMode === "ranking" && (
          <>
            <section className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <input
                placeholder="Buscar símbolo o nombre…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="border rounded-xl px-3 py-2 text-sm md:col-span-2"
              />
              <select value={bucket} onChange={(e) => setBucket(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                <option value="">Bucket (todos)</option>
                {BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select value={atype} onChange={(e) => setAtype(e.target.value)} className="border rounded-xl px-3 py-2 text-sm">
                <option value="">Tipo (todos)</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <label className="text-sm w-20">Min score</label>
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
              <span className="text-gray-600">Ordenar por:</span>
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
                <option value="liq_score">Liquidez</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as "asc" | "desc")} className="border rounded-lg px-2 py-1">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <span className="ml-auto text-gray-500">{filteredRanking.length} resultados</span>
            </section>

            <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2">Símbolo</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2 text-right">Mom 1m</th>
                    <th className="px-3 py-2 text-right">Mom 3m</th>
                    <th className="px-3 py-2 text-right">Mom 6m</th>
                    <th className="px-3 py-2 text-right">Mom 1y</th>
                    <th className="px-3 py-2 text-right">RS vs SPY</th>
                    <th className="px-3 py-2 text-right">Liquidez</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRanking.map((r) => (
                    <tr key={r.symbol} className="border-t hover:bg-gray-50">
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
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpen(r)} className="px-3 py-1 rounded-lg bg-black text-white text-xs">
                            Ver
                          </button>
                          {r.racional_url ? (
                            <a href={r.racional_url} target="_blank" className="px-3 py-1 rounded-lg bg-white border text-xs hover:bg-gray-100">
                              Racional
                            </a>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredRanking.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-3 py-6 text-center text-gray-500">
                        No hay resultados con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {/* Turnarounds */}
        {viewMode === "turnarounds" && (
          <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-3 py-2">Símbolo</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2 text-right">Rebote 52w</th>
                  <th className="px-3 py-2 text-right">Mom 1m</th>
                  <th className="px-3 py-2 text-right">Mom 3m</th>
                  <th className="px-3 py-2 text-right">Vol surge</th>
                  <th className="px-3 py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {turnRows.map((t) => (
                  <tr key={t.symbol} className="border-t hover:bg-gray-50">
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
                          openFromSymbol(t.symbol, t.name, t.asset_type, t.racional_url)
                        }
                        className="px-3 py-1 rounded-lg bg-black text-white text-xs"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
                {turnRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                      Sin candidatos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Compounders */}
        {viewMode === "compounders" && (
          <>
            {/* Controles */}
            <section className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Horizonte:</span>
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
                <label className="text-sm w-28">CAGR ≥</label>
                <input
                  type="number"
                  step="0.01"
                  value={cagrMin}
                  onChange={(e) => setCagrMin(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-full"
                />
                <span className="text-sm text-gray-600">({(cagrMin * 100).toFixed(0)}%)</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm w-28">% meses + ≥</label>
                <input
                  type="number"
                  step="0.01"
                  value={posMonthsMin}
                  onChange={(e) => setPosMonthsMin(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-full"
                />
                <span className="text-sm text-gray-600">({(posMonthsMin * 100).toFixed(0)}%)</span>
              </div>

              <div className="flex items-center gap-2 md:col-span-2">
                <label className="text-sm w-36">Max DD ≥</label>
                <input
                  type="number"
                  step="0.01"
                  value={maxDDMax}
                  onChange={(e) => setMaxDDMax(parseFloat(e.target.value || "0"))}
                  className="border rounded-lg px-2 py-1 text-sm w-full"
                />
                <span className="text-sm text-gray-600">({(maxDDMax * 100).toFixed(0)}%)</span>
              </div>
            </section>

            {/* Tabla */}
            <section className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2">Símbolo</th>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2 text-right">CAGR</th>
                    <th className="px-3 py-2 text-right">% meses +</th>
                    <th className="px-3 py-2 text-right">Max DD</th>
                    <th className="px-3 py-2 text-right">Días</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompounders.map((r) => {
                    const cagr =
                      cmpHorizon === "1Y" ? r.cagr_1y : cmpHorizon === "3Y" ? r.cagr_3y : r.cagr_5y;
                    return (
                      <tr key={r.symbol} className="border-t hover:bg-gray-50">
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
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCompounders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                        No hay resultados con los filtros actuales.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-10 text-xs text-gray-500">
        Hecho con Supabase + yfinance • Rangos diarios: 1D–5Y
      </footer>
    </div>
  );
}

// ====== Descripción ver más/menos ======
function DescriptionBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = React.useState(false);
  const MAX = 420;
  const short = text.length > MAX ? text.slice(0, MAX) + "…" : text;
  return (
    <div className="text-sm text-gray-700">
      <div className="whitespace-pre-line">{expanded ? text : short}</div>
      {text.length > MAX && (
        <button
          className="mt-1 text-xs text-blue-600 hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}
