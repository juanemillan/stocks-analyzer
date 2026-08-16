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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { symbol } = await params;
  const safe = symbol.replace(/[^A-Za-z0-9.\-]/g, "").toUpperCase();
  if (!safe) {
    return NextResponse.json({ ok: false, error: "invalid_symbol" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `WITH latest_score AS (SELECT MAX(date) AS date FROM scores_daily)
     SELECT a.symbol, a.name, a.asset_type, a.racional_url, a.logo_url, a.website, a.sector, a.industry, a.country,
            COALESCE(s.date, current_date)::text AS date, s.final_score, s.bucket, s.mom_1w, s.mom_1m, s.mom_3m, s.mom_6m, s.mom_1y,
            s.rs_spy, s.tech_trend, s.liq_score
     FROM assets a
     LEFT JOIN latest_score ls ON true
     LEFT JOIN scores_daily s ON s.symbol = a.symbol AND s.date = ls.date
     WHERE a.symbol = $1 AND a.is_active = true
     LIMIT 1`,
    [safe]
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, asset: parseRow(row) });
}

