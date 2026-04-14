"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type AlertType = "stop_loss" | "take_profit" | "price_above" | "price_below";

export type AlertRule = {
  id: string;
  symbol: string;
  type: AlertType;
  threshold: number;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
};

export function useAlerts() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("alert_rules")
      .select("id, symbol, type, threshold, active, triggered_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRules((data ?? []) as AlertRule[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  /** Upsert a rule (insert or replace existing type for same symbol). */
  const upsert = useCallback(
    async (symbol: string, type: AlertType, threshold: number) => {
      if (!userId) return;
      const supabase = createClient();
      await supabase.from("alert_rules").upsert(
        { user_id: userId, symbol, type, threshold, active: true, triggered_at: null },
        { onConflict: "user_id,symbol,type" },
      );
      await load(userId);
    },
    [userId, load],
  );

  /** Delete a rule by id. */
  const remove = useCallback(
    async (ruleId: string) => {
      if (!userId) return;
      const supabase = createClient();
      await supabase.from("alert_rules").delete().eq("id", ruleId).eq("user_id", userId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    },
    [userId],
  );

  /** Rules for a specific symbol. */
  const forSymbol = useCallback(
    (symbol: string) => rules.filter((r) => r.symbol === symbol),
    [rules],
  );

  return { rules, loading, upsert, remove, forSymbol };
}
