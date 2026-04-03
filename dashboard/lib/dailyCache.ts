/** Cache helpers that store data keyed by today's date (YYYY-MM-DD).
 *  Stale entries (yesterday or older) are evicted automatically on read. */

const todayStr = () => new Date().toISOString().slice(0, 10);

export function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { date, data } = JSON.parse(raw) as { date: string; data: T };
    if (date !== todayStr()) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

export function cacheSet<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ date: todayStr(), data }));
  } catch { /* storage full — fail silently */ }
}
