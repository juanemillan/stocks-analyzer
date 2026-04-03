"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export function useStockNote(symbol: string | null) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoaded(false);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
      if (!userIdRef.current) { setLoaded(true); return; }
      supabase
        .from("stock_notes")
        .select("note")
        .eq("symbol", symbol)
        .maybeSingle()
        .then(({ data: row }) => {
          setNote(row?.note ?? "");
          setLoaded(true);
        });
    });
  }, [symbol]);

  async function save() {
    if (!symbol || !userIdRef.current) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("stock_notes").upsert(
      { user_id: userIdRef.current, symbol, note, updated_at: new Date().toISOString() },
      { onConflict: "user_id,symbol" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return { note, setNote, save, saving, saved, loaded };
}
