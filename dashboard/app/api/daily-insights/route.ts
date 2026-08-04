import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const lang = req.nextUrl.searchParams.get("lang") === "en" ? "en" : "es";

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    select: "date,lang,sentiment_score,sentiment_label,sentiment_summary,aggregate_scores,ai_insight,version,created_at",
    lang: `eq.${lang}`,
    order: "date.desc",
    limit: "100",
  });
  const url = `${SUPABASE_URL}/rest/v1/daily_insights?${params}`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn("[daily-insights] supabase error", res.status, body);
      return NextResponse.json({ error: "upstream_error" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }
}
