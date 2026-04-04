import { LABELS } from "@/app/i18n";
import type { Lang } from "@/app/types";

export const BUCKETS = ["Alta Convicción", "Vigilancia", "Descartar"] as const;
export const TYPES = ["EQUITY", "ETF", "FUND", "OTHER"] as const;
export const RANGE_OPTIONS: Array<{ key: string; days: number }> = [
  { key: "1D", days: 1 },
  { key: "1S", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 365 * 5 },
];

export function logoSrc(symbol: string) {
  return `/api/logo/${encodeURIComponent(symbol)}`;
}

const BUCKET_KEY_MAP: Record<string, keyof typeof LABELS> = {
  "Alta Convicción": "bktHighConviction",
  "Vigilancia":      "bktWatch",
  "Descartar":       "bktDiscard",
};

export function bucketDisplay(b: string, lang: Lang): string {
  const key = BUCKET_KEY_MAP[b];
  return key ? LABELS[key][lang] : b;
}

export function bucketColor(b: string): string {
  if (b === "Alta Convicción") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  if (b === "Vigilancia")      return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (b === "Descartar")       return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

export function fmtBig(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(2);
}

export type Holding = { id: string; symbol: string; shares: number; avg_cost: number | null; sold_at?: string | null };
