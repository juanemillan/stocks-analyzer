"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type WatchlistDetails = { thesis: string | null; target_price: number | null; review_date: string | null; status: "watching" | "researching" | "ready" | "passed" };

export function useWatchlist() {
  const [userId, setUserId] = useState<string | null>(null);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, WatchlistDetails>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    supabase
      .from("watchlist")
      .select("symbol, thesis, target_price, review_date, status")
      .then(({ data }) => {
        setWatchlist(new Set((data ?? []).map((r: { symbol: string }) => r.symbol)));
        setDetails(Object.fromEntries((data ?? []).map((r: any) => [r.symbol, { ...r, target_price: r.target_price == null ? null : Number(r.target_price) }])));
      });
  }, [userId]);

  const toggle = useCallback(
    async (symbol: string) => {
      if (!userId) return;
      const supabase = createClient();
      if (watchlist.has(symbol)) {
        setWatchlist((prev) => {
          const next = new Set(prev);
          next.delete(symbol);
          return next;
        });
        await supabase.from("watchlist").delete().eq("user_id", userId).eq("symbol", symbol);
      } else {
        setWatchlist((prev) => new Set(prev).add(symbol));
        await supabase.from("watchlist").insert({ user_id: userId, symbol });
      }
    },
    [userId, watchlist]
  );

  const bulkAdd = useCallback(
    async (symbols: string[]) => {
      if (!userId) return;
      const toAdd = symbols.filter((s) => !watchlist.has(s));
      if (!toAdd.length) return;
      setWatchlist((prev) => new Set([...prev, ...toAdd]));
      const supabase = createClient();
      await supabase
        .from("watchlist")
        .upsert(
          toAdd.map((symbol) => ({ user_id: userId, symbol })),
          { onConflict: "user_id,symbol", ignoreDuplicates: true }
        );
    },
    [userId, watchlist]
  );

  const saveDetails = useCallback(async (symbol: string, values: WatchlistDetails) => {
    if (!userId) return;
    const supabase = createClient();
    const next = { ...values, thesis: values.thesis?.trim() || null };
    setDetails((prev) => ({ ...prev, [symbol]: next }));
    await supabase.from("watchlist").upsert({ user_id: userId, symbol, ...next }, { onConflict: "user_id,symbol" });
  }, [userId]);

  return { watchlist, details, toggle, bulkAdd, saveDetails, userId };
}
