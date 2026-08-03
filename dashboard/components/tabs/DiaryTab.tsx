"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/app/i18n";
import type { DailyInsight, Lang } from "@/app/types";
import { InfoBox } from "@/components/ui/InfoBox";

type ApiResponse = { data?: DailyInsight[]; error?: string };

function sentimentTone(label: string | null) {
  if (label === "Bullish") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
  if (label === "Bearish") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
}

export function DiaryTab({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<DailyInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/daily-insights?lang=${lang}`, { cache: "no-store" });
        const body = (await res.json()) as ApiResponse;
        if (!res.ok) throw new Error(body.error || "failed_to_load_diary");
        if (!cancelled) setItems(Array.isArray(body.data) ? body.data : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "failed_to_load_diary");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const latest = items[0] ?? null;
  const history = useMemo(() => items.slice(1, 8), [items]);

  return (
    <div className="animate-fadeIn space-y-4">
      <InfoBox text={t("diarySubtitle", lang)} label={t("diaryTitle", lang)} />

      <div>
        <h2 className="text-lg font-bold">{t("diaryTitle", lang)}</h2>
        <p className="text-sm text-gray-500">{t("diarySubtitle", lang)}</p>
      </div>

      {loading && (
        <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm dark:bg-neutral-900">
          {t("diaryLoading", lang)}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Error: {error}
        </div>
      )}

      {!loading && !error && !latest && (
        <div className="rounded-2xl border bg-white px-4 py-6 text-sm text-gray-500 shadow-sm dark:bg-neutral-900">
          {t("diaryEmpty", lang)}
        </div>
      )}

      {latest && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border bg-white shadow-sm dark:bg-neutral-900">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{t("diaryLatest", lang)}</div>
                  <h3 className="text-base font-semibold">
                    {new Date(latest.date + "T12:00:00Z").toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { dateStyle: "full" })}
                  </h3>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${sentimentTone(latest.sentiment_label)}`}>
                  {latest.sentiment_label || "N/A"}
                </span>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{t("diarySummary", lang)}</div>
                <p className="text-sm leading-6 text-gray-700 dark:text-gray-200">{latest.sentiment_summary || "-"}</p>
              </div>

              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{t("diaryAIInsight", lang)}</div>
                <div className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                  {latest.ai_insight || "-"}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{t("diaryStats", lang)}</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-neutral-800">
                  <div className="text-xs text-gray-500">{t("diarySentiment", lang)}</div>
                  <div className="mt-1 font-mono text-base">{latest.sentiment_score != null ? latest.sentiment_score.toFixed(3) : "-"}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-neutral-800">
                  <div className="text-xs text-gray-500">{t("diaryAssetsCount", lang)}</div>
                  <div className="mt-1 font-mono text-base">{latest.aggregate_scores?.count ?? "-"}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-neutral-800">
                  <div className="text-xs text-gray-500">{t("diaryAvgScore", lang)}</div>
                  <div className="mt-1 font-mono text-base">{latest.aggregate_scores?.avg_score != null ? Number(latest.aggregate_scores.avg_score).toFixed(3) : "-"}</div>
                </div>
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-neutral-800">
                  <div className="text-xs text-gray-500">{t("diaryVersion", lang)}</div>
                  <div className="mt-1 font-mono text-base">{latest.version || "-"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-neutral-900">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{t("diaryHistory", lang)}</div>
              <div className="space-y-2">
                {history.length === 0 && <div className="text-sm text-gray-500">{t("diaryEmpty", lang)}</div>}
                {history.map((item) => (
                  <div key={item.date} className="rounded-xl border border-gray-200 px-3 py-2 dark:border-neutral-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {new Date(item.date + "T12:00:00Z").toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sentimentTone(item.sentiment_label)}`}>
                        {item.sentiment_label || "N/A"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.sentiment_summary || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
