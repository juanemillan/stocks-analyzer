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

os.chdir(os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"].replace("sslmode=no-verify", "sslmode=require")
OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]

TODAY = date.today().isoformat()

# Models to try in order (free tier)
MODELS = [
    "qwen/qwen3.6-plus:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "stepfun/step-3.5-flash:free",
]

SYSTEM_PROMPT = """You are Bullia AI, a financial analysis assistant embedded in the Bullia stock-screening dashboard.
Generate a concise nightly market insight (3-5 bullets, 120-180 words) based on today's ranking data.
- Lead with the most notable theme or trend across the top-conviction assets
- Mention 2-3 specific ticker symbols with their score and bucket
- Note any interesting pattern in momentum or turnarounds
- End with a one-line disclaimer
- Use **bold** for ticker symbols and key terms
- No markdown tables or numbered lists
- Write only in the language specified by the user prompt"""


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
                content = res.json()["choices"][0]["message"]["content"].strip()
                if content:
                    print(f"  ✅ Model {model} responded ({len(content)} chars)")
                    return content
            else:
                print(f"  ⚠  Model {model} → HTTP {res.status_code}")
        except Exception as exc:
            print(f"  ❌ Model {model} error: {exc}")
    return None


def upsert_insight(lang: str, content: str):
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
        print(f"  ✅ Upserted {lang} insight → HTTP {resp.status}")


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
            upsert_insight(lang, content)
        else:
            print(f"  ❌ Failed to generate {lang} insight")

    print("\n[generate_insights] Done.")


if __name__ == "__main__":
    main()
