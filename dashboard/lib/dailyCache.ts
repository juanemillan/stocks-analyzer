/** Cache helpers for shared daily data and short-lived detail responses. */

const todayStr = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
}).format(new Date());

export function cacheGet<T>(key: string, maxAgeMs?: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { date, cachedAt, data } = JSON.parse(raw) as { date: string; cachedAt?: number; data: T };
    if (date !== todayStr()) { localStorage.removeItem(key); return null; }
    if (maxAgeMs != null && cachedAt != null) {
      if (Date.now() - cachedAt <= maxAgeMs) return data;
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch { return null; }
}

export function cacheSet<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ date: todayStr(), cachedAt: Date.now(), data }));
  } catch { /* storage full — fail silently */ }
}
