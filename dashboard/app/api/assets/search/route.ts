import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

function parseRow(row: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    result[k] = typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : v;
  }
  return result;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") ?? "";
  const q = qRaw.trim();
  if (q.length < 1) return NextResponse.json({ ok: true, results: [] });

  // Search the small assets table, not v_assets_rank: that view calculates
  // ranking history and makes an autocomplete request unnecessarily expensive.
  const sym = q.replace(/[^A-Za-z0-9.\-]/g, "").toUpperCase();
  if (!sym) return NextResponse.json({ ok: true, results: [] });
  const symbolEnd = `${sym}\uffff`;

  const { rows } = await pool.query(
    `SELECT symbol, name, asset_type, racional_url
     FROM assets
     WHERE is_active = true
       AND (symbol >= $1 AND symbol < $2 OR name ILIKE $3)
     ORDER BY CASE WHEN symbol >= $1 AND symbol < $2 THEN 0 ELSE 1 END, symbol
     LIMIT 8`,
    [sym, symbolEnd, `${q}%`]
  );

  return NextResponse.json({ ok: true, results: rows.map((r) => parseRow(r)) });
}

