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
    `SELECT symbol, name, asset_type, racional_url, logo_url, website, sector, industry, country,
            date, final_score, bucket, mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
            rs_spy, tech_trend, liq_score, prev_score, score_delta
     FROM v_assets_rank
     WHERE symbol = $1
     LIMIT 1`,
    [safe]
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, asset: parseRow(row) });
}

