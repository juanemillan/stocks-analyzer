#!/usr/bin/env python3
"""
generate_insights.py — Generate AI nightly market insight cards using OpenRouter.

Runs after the daily ETL scores are computed. Fetches the top-25 assets from
v_assets_rank, builds a compact prompt, calls OpenRouter, and upserts the
generated markdown insight into Supabase `ai_insights` for both ES and EN.

Environment:
    DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENROUTER_API_KEY
"""

import os
import sys
import json
import psycopg2
import requests
from datetime import date
from supabase import create_client, Client

os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"].replace("sslmode=no-verify", "sslmode=require")
OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]

TODAY = date.today().isoformat()

# Models to try in order — instruction-following only, no reasoning/thinking models
MODELS = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "google/gemma-3-12b-it:free",
    "mistralai/mistral-7b-instruct:free",
]

SYSTEM_PROMPT = """You are Bullia AI, a financial analysis assistant embedded in the Bullia stock-screening dashboard.
Generate a concise nightly market insight (3-5 bullets, 120-180 words) based on today's ranking data.
- Lead with the most notable theme or trend across the top-conviction assets
- Mention 2-3 specific ticker symbols with their score and bucket
- Note any interesting pattern in momentum or turnarounds
- End with a one-line disclaimer
- Use **bold** for ticker symbols and key terms
- No markdown tables or numbered lists
- Write only in the language specified by the user prompt
- Never output your reasoning process or thinking steps. Go directly to the final insight."""

# Initialize Supabase client (service role key required)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_ranking():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT symbol, name, final_score, bucket, mom_1m, mom_3m, score_delta
        FROM v_assets_rank
        ORDER BY final_score DESC NULLS LAST
        LIMIT 25
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def build_ranking_text(rows):
    lines = []
    for symbol, name, score, bucket, mom1m, mom3m, delta in rows:
        lines.append(
            f"{symbol} ({name or ''}): score={float(score or 0):.3f} bucket={bucket or '?'} "
            f"mom1m={float(mom1m or 0):.1%} mom3m={float(mom3m or 0):.1%} delta={float(delta or 0):+.3f}"
        )
    return "\n".join(lines)


def call_openrouter(user_prompt: str) -> str | None:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bullia.app",
        "X-Title": "Bullia AI Nightly Insights",
    }
    payload = {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 400,
        "temperature": 0.5,
    }
    for model in MODELS:
        try:
            payload["model"] = model
            res = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30,
            )
            if res.ok:
                import re
                raw = res.json()["choices"][0]["message"]["content"].strip()
                # Strip <think>...</think> reasoning blocks emitted by some models
                content = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
                if content:
                    print(f"  ✅ Model {model} responded ({len(content)} chars)")
                    return content
            else:
                print(f"  ⚠  Model {model} → HTTP {res.status_code}")
        except Exception as exc:
            print(f"  ❌ Model {model} error: {exc}")
    return None


def upsert_insight(lang: str, content: str, rows):
    """Upsert both the legacy `ai_insights` and the new `daily_insights` record.

    `rows` is the ranking rows used to compute simple aggregates stored in `daily_insights`.
    """
    # Legacy: keep existing REST upsert to `ai_insights` for compatibility
    try:
        import urllib.request
        url = f"{SUPABASE_URL}/rest/v1/ai_insights"
        payload = json.dumps({
            "date": TODAY,
            "lang": lang,
            "content": content,
        }).encode()
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates",
            },
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            print(f"  ✅ Upserted {lang} insight (legacy ai_insights) → HTTP {resp.status}")
    except Exception as exc:
        print(f"  ⚠ Legacy ai_insights upsert failed: {exc}", file=sys.stderr)

    # Compute simple aggregate scores from ranking rows
    try:
        scores = [r[2] for r in rows if r[2] is not None]
        avg_score = float(sum(scores) / len(scores)) if scores else None
    except Exception:
        avg_score = None

    if avg_score is None:
        sentiment_score = None
        sentiment_label = None
    else:
        sentiment_score = avg_score
        if sentiment_score >= 0.6:
            sentiment_label = "Bullish"
        elif sentiment_score <= 0.4:
            sentiment_label = "Bearish"
        else:
            sentiment_label = "Neutral"

    # Short summary: first non-empty line or first 160 chars
    first_line = next((ln for ln in (l.strip() for l in content.splitlines()) if ln), "")
    sentiment_summary = (first_line[:180] + "...") if first_line and len(first_line) > 180 else first_line

    record = {
        "date": TODAY,
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "sentiment_summary": sentiment_summary,
        "top_news": None,
        "aggregate_scores": {"avg_score": sentiment_score, "count": len(rows)},
        "notable_events": None,
        "ai_insight": content,
        "whale_activity": None,
        "reviewer_feedback": None,
        "raw_data": {"ranking_text": build_ranking_text(rows)},
        "version": "v1",
    }

    # Upsert into Supabase `daily_insights` keyed by date and language.
    try:
        record["lang"] = lang
        res = supabase.table("daily_insights").upsert(record, on_conflict="date,lang").execute()
        # supabase-py returns a tuple-like response; check for error
        if hasattr(res, "status_code") and res.status_code >= 400:
            print(f"  ❌ daily_insights upsert failed → HTTP {res.status_code}", file=sys.stderr)
        else:
            print("  ✅ Upserted daily_insights record via Supabase client")
    except Exception as exc:
        print(f"  ❌ daily_insights upsert error: {exc}", file=sys.stderr)


def main():
    print(f"[generate_insights] date={TODAY}")

    rows = fetch_ranking()
    if not rows:
        print("  ⚠  No ranking data — skipping")
        sys.exit(0)

    ranking_text = build_ranking_text(rows)
    print(f"  Fetched {len(rows)} assets from ranking")

    for lang, lang_instruction in [
        ("en", "Write the insight in English."),
        ("es", "Escribe el insight en español."),
    ]:
        print(f"\nGenerating {lang.upper()} insight…")
        user_prompt = f"{lang_instruction}\n\nToday's ranking data ({TODAY}):\n{ranking_text}"
        content = call_openrouter(user_prompt)
        if content:
            upsert_insight(lang, content, rows)
        else:
            print(f"  ❌ Failed to generate {lang} insight")

    print("\n[generate_insights] Done.")


if __name__ == "__main__":
    main()
