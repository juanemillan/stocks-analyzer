"use client";

import type { Lang, RankRow, ValueQualityRow } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";
import { SymbolLogo } from "@/components/ui/SymbolLogo";

export function ValueQualityTab({ rows, lang, onOpenFromSymbol }: {
  rows: ValueQualityRow[];
  lang: Lang;
  onOpenFromSymbol: (symbol: string, name?: string | null, asset_type?: string | null, racional_url?: string | null, extras?: Partial<RankRow>) => void;
}) {
  const es = lang === "es";
  return (
    <div className="animate-fadeIn">
      <InfoBox
        label={es ? "¿Cómo se calcula?" : "How is it calculated?"}
        text={es
          ? "Busca empresas rentables con flujo de caja positivo, ROE alto, deuda razonable y múltiplos moderados. Es una pantalla de investigación inspirada en inversión de calidad a largo plazo, no una recomendación ni una valoración intrínseca."
          : "It looks for profitable companies with positive free cash flow, high ROE, reasonable debt, and moderate multiples. This is a long-term quality-investing research screen, not a recommendation or intrinsic valuation."}
      />
      <div className="mb-4">
        <h2 className="text-lg font-bold">{es ? "Calidad & Valor" : "Quality & Value"}</h2>
        <p className="text-sm text-gray-500">{es ? "Estilo Buffett: negocio de calidad a un precio razonable." : "Buffett-style: quality businesses at reasonable prices."}</p>
      </div>
      <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[780px] w-full text-left text-sm">
            <thead className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="px-3 py-2">{es ? "Empresa" : "Company"}</th>
                <th className="px-3 py-2 text-right">ROE</th>
                <th className="px-3 py-2 text-right">P/E</th>
                <th className="px-3 py-2 text-right">EV/EBITDA</th>
                <th className="px-3 py-2 text-right">{es ? "Margen" : "Margin"}</th>
                <th className="px-3 py-2 text-right">{es ? "Criterios" : "Criteria"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.symbol} onClick={() => onOpenFromSymbol(row.symbol, row.name, row.asset_type, row.racional_url)} className="border-t dark:border-neutral-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><SymbolLogo symbol={row.symbol} size={28} /><div><div className="font-semibold">{row.symbol}</div><div className="text-xs text-gray-500 truncate max-w-48">{row.name ?? "—"}</div></div></div></td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.return_on_equity == null ? "—" : `${(row.return_on_equity * 100).toFixed(1)}%`}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.trailing_pe?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.enterprise_to_ebitda?.toFixed(1) ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{row.profit_margins == null ? "—" : `${(row.profit_margins * 100).toFixed(1)}%`}</td>
                  <td className="px-3 py-2 text-right"><span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">{row.value_quality_score}/6</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">{es ? "Aún no hay fundamentales actualizados. Ejecuta el enriquecimiento del pipeline para cargar esta pantalla." : "Fundamentals have not been refreshed yet. Run the pipeline enrichment to populate this screen."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-3 text-xs text-gray-500">{es ? "Métricas provenientes del proveedor de datos; compáralas con pares del mismo sector y revisa la tesis completa." : "Metrics come from the data provider; compare them with same-sector peers and review the full thesis."}</p>
    </div>
  );
}
