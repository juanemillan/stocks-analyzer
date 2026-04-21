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

  // Use ILIKE for name search; prefer symbol prefix matches.
  const sym = q.replace(/[^A-Za-z0-9.\-]/g, "").toUpperCase();
  const like = `%${q}%`;

  const { rows } = await pool.query(
    `SELECT symbol, name, asset_type, racional_url, date, final_score, bucket, mom_1w, mom_1m, mom_3m, mom_6m, mom_1y,
            rs_spy, tech_trend, liq_score, prev_score, score_delta
     FROM v_assets_rank
     WHERE symbol ILIKE $1 OR name ILIKE $2
     ORDER BY
       CASE WHEN symbol ILIKE $3 THEN 0 ELSE 1 END,
       final_score DESC NULLS LAST
     LIMIT 8`,
    [like, like, `${sym}%`]
  );

  return NextResponse.json({ ok: true, results: rows.map((r) => parseRow(r)) });
}

