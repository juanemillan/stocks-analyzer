"""
check_portfolio_alerts.py
─────────────────────────────────────────────────────────────────────────────
Runs nightly (via GitHub Actions) after the ETL refreshes prices.

Two types of alerts per holding:

  1. P&L Milestones  — fires when gain/loss crosses +50, +100, +200, +300, -20, -30 %
                       Resets when the holding recovers to 80% of that threshold.

  2. Opportunity Signals — "should I add to this position?"
       • score_upgrade  : score_delta > 0.05 (meaningful score improvement today)
       • accum_zone     : stock appears in the accumulation_zone view (near 52w low,
                          showing early momentum / volume signs)
       • mom_recovery   : mom_1w just turned positive while mom_1m is still negative
                          (first green week after a downtrend — classic add signal)
     Opportunity alerts re-fire at most once every 7 days per signal type.

     An AI model (OpenRouter free tier) generates a 2-3 sentence analysis for each
     holding with at least one opportunity signal.

Environment variables (GitHub Secrets):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
    DATABASE_URL            — CockroachDB connection string
    RESEND_API_KEY
    OPENROUTER_API_KEY      — for AI analysis (optional; skips AI block if missing)
    FROM_EMAIL              — e.g. "Bullia <onboarding@resend.dev>"
    ALERT_EMAIL             — fallback destination if user email lookup fails
    DASHBOARD_URL           — link shown in email
"""

import os
import requests
import psycopg2
from datetime import datetime, timezone, timedelta
from collections import defaultdict

os.chdir(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

try:
    from supabase import create_client
except ImportError:
    raise SystemExit("supabase-py not installed.  Run: pip install supabase")

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL   = os.environ["SUPABASE_URL"]
SUPABASE_KEY   = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
DATABASE_URL   = os.environ["DATABASE_URL"]
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
FROM_EMAIL     = os.environ.get("FROM_EMAIL", "Bullia Alerts <onboarding@resend.dev>")
FALLBACK_EMAIL = os.environ.get("ALERT_EMAIL", "")
DASHBOARD_URL  = os.environ.get("DASHBOARD_URL", "https://bullia.app")

THRESHOLDS_UP   = [50, 100, 200, 300]
THRESHOLDS_DOWN = [-20, -30]
ALL_THRESHOLDS  = THRESHOLDS_UP + THRESHOLDS_DOWN

OPENROUTER_URL       = "https://openrouter.ai/api/v1/chat/completions"
FREE_MODELS          = [
    # Qwen (best financial reasoning on free tier — try newest first)
    "qwen/qwen3-14b:free",
    "qwen/qwen3.6-plus:free",
    "qwen/qwen3-8b:free",
    "qwen/qwen2.5-72b-instruct:free",
    "qwen/qwen-2.5-7b-instruct:free",
    # NVIDIA / Meta / Mistral fallbacks
    "nvidia/nemotron-super-49b-v1:free",
    "meta-llama/llama-4-scout:free",
    "meta-llama/llama-4-maverick:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "mistralai/mistral-small-3.2-24b-instruct:free",
    "mistralai/devstral-small:free",
    # Additional safety net
    "deepseek/deepseek-r1-0528:free",
    "google/gemma-3-12b-it:free",
    "microsoft/phi-4-reasoning-plus:free",
]
OPPORTUNITY_TTL_DAYS = 7   # re-alert at most once per week per signal type


# ── CockroachDB queries ───────────────────────────────────────────────────────

def db_fetch_latest_prices(conn, symbols: list) -> dict:
    if not symbols:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT DISTINCT ON (symbol) symbol, close
            FROM prices_daily
            WHERE symbol = ANY(%s)
            ORDER BY symbol, date DESC
            """,
            (symbols,),
        )
        return {row[0]: float(row[1]) for row in cur.fetchall()}


def db_fetch_rank_data(conn, symbols: list) -> dict:
    """Fetch scoring / momentum data from v_assets_rank for the given holdings."""
    if not symbols:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT symbol, name, final_score, bucket, score_delta,
                   mom_1w, mom_1m, mom_3m, mom_6m, mom_1y, rs_spy,
                   tech_trend, liq_score
            FROM v_assets_rank
            WHERE symbol = ANY(%s)
            """,
            (symbols,),
        )
        cols = [d[0] for d in cur.description]
        return {row[0]: dict(zip(cols, row)) for row in cur.fetchall()}


def db_fetch_accum_symbols(conn, symbols: list) -> set:
    """Return subset of symbols currently in the accumulation zone."""
    if not symbols:
        return set()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT symbol FROM v_accumulation_zone WHERE symbol = ANY(%s)",
            (symbols,),
        )
        return {row[0] for row in cur.fetchall()}


# ── AI analysis via OpenRouter ────────────────────────────────────────────────

def get_ai_analysis_batch(stocks: list) -> dict:
    """Send ONE prompt covering all opportunity-triggered stocks; return {symbol: text}.

    Each entry in `stocks` must have keys: symbol, pct_chg, current, avg_cost,
    shares, signals, and rank (the dict from rank_map).
    """
    import time as _time

    if not OPENROUTER_KEY or not stocks:
        return {}

    stock_syms = {s["symbol"] for s in stocks}
    lines = []
    for s in stocks:
        r = s.get("rank", {})
        lines.append(
            f"- {s['symbol']}: P&L {s['pct_chg']:+.1f}% | signals: {', '.join(s['signals'])} | "
            f"score={r.get('final_score','?')} (Δ{r.get('score_delta','?')}) | "
            f"mom 1w={r.get('mom_1w','?')}% 1m={r.get('mom_1m','?')}% | "
            f"trend={r.get('tech_trend','?')} | RS_SPY={r.get('rs_spy','?')}"
        )

    prompt = (
        "You are a financial analyst. For each stock below, write exactly ONE short sentence "
        "(20-30 words, no markdown, no bullet points) on whether now is a good time to add "
        "to the position based on the signals and metrics provided. "
        "Reply in this EXACT format — one line per stock, symbol in uppercase followed by a colon:\n"
        "SYMBOL: sentence\n\n"
        + "\n".join(lines)
    )

    for model in FREE_MODELS:
        short_model = model.split("/")[-1]
        try:
            resp = requests.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": DASHBOARD_URL,
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 60 * len(stocks),
                    "temperature": 0.4,
                },
                timeout=45,
            )
            if resp.status_code == 429:
                print(f"  [ai/{short_model}] 429 rate-limited — waiting 5s before next model …")
                _time.sleep(5)
                continue
            if resp.ok:
                text = resp.json()["choices"][0]["message"]["content"].strip()
                print(f"  [ai/{short_model}] OK — parsing {len(stocks)} stock(s)")
                result: dict = {}
                for line in text.splitlines():
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        sym = parts[0].strip().upper()
                        if sym in stock_syms:
                            result[sym] = parts[1].strip()
                return result
            print(f"  [ai/{short_model}] HTTP {resp.status_code} — trying next model")
        except Exception as e:
            print(f"  [ai/{short_model}] error: {e} — trying next model")

    return {}


# ── Email builder ─────────────────────────────────────────────────────────────

def _opportunity_card(opp: dict) -> str:
    signal_labels = {
        "score_upgrade": "📊 Score upgraded significantly today",
        "accum_zone":    "🎯 In accumulation zone (near 52w low with early momentum)",
        "mom_recovery":  "🔄 Momentum recovery — first positive week after downtrend",
    }
    pnl_color = "#16a34a" if opp["pct_chg"] >= 0 else "#dc2626"
    sign = "+" if opp["pct_chg"] >= 0 else ""
    signal_html = "".join(
        f'<div style="margin:4px 0;font-size:13px;color:#374151">{signal_labels.get(s, s)}</div>'
        for s in opp["signals"]
    )
    ai_html = (
        f'<div style="margin-top:10px;padding:10px 12px;background:#f0fdf4;border-left:3px solid #10b981;'
        f'border-radius:6px;font-size:13px;color:#374151;line-height:1.5">'
        f'<span style="font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;'
        f'letter-spacing:.5px">AI Analysis</span><br>{opp["ai"]}</div>'
    ) if opp.get("ai") else ""

    return (
        f'<div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:12px;background:#fff">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">'
        f'<div><span style="font-size:18px;font-weight:800;color:#111">{opp["symbol"]}</span>'
        f'<span style="margin-left:8px;font-size:12px;color:#6b7280">{opp.get("name","")}</span></div>'
        f'<div style="text-align:right">'
        f'<div style="font-size:16px;font-weight:700">${opp["current"]:.2f}</div>'
        f'<div style="font-size:13px;font-weight:600;color:{pnl_color}">{sign}{opp["pct_chg"]:.1f}% from avg ${opp["avg_cost"]:.2f}</div>'
        f'</div></div>'
        f'{signal_html}{ai_html}</div>'
    )


def _pnl_row(a: dict) -> str:
    is_up  = a["threshold"] > 0
    color  = "#16a34a" if is_up else "#dc2626"
    icon   = "📈" if is_up else "📉"
    sign   = "+" if a["pct_chg"] >= 0 else ""
    t_sign = "+" if a["threshold"] > 0 else ""
    return (
        f'<tr style="border-bottom:1px solid #f3f4f6">'
        f'<td style="padding:10px 12px;font-weight:700">{a["symbol"]}</td>'
        f'<td style="padding:10px 12px;text-align:right;color:#6b7280">${a["avg_cost"]:.2f}</td>'
        f'<td style="padding:10px 12px;text-align:right">${a["current"]:.2f}</td>'
        f'<td style="padding:10px 12px;text-align:right;font-weight:800;color:{color};font-size:15px">{sign}{a["pct_chg"]:.1f}%</td>'
        f'<td style="padding:10px 12px;text-align:right;color:{color}">{icon} {t_sign}{a["threshold"]}% reached</td>'
        f'</tr>'
    )


def build_email_html(opportunities: list, pnl_alerts: list) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    opp_section = ""
    if opportunities:
        cards = "".join(_opportunity_card(o) for o in opportunities)
        opp_section = (
            f'<div style="margin-bottom:28px">'
            f'<div style="font-size:13px;font-weight:700;color:#059669;text-transform:uppercase;'
            f'letter-spacing:.6px;margin-bottom:12px">💡 Opportunity Signals</div>'
            f'{cards}</div>'
        )

    pnl_section = ""
    if pnl_alerts:
        rows = "".join(_pnl_row(a) for a in pnl_alerts)
        pnl_section = (
            f'<div>'
            f'<div style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;'
            f'letter-spacing:.6px;margin-bottom:12px">📊 P&L Milestones</div>'
            f'<table style="width:100%;border-collapse:collapse;font-size:14px">'
            f'<thead><tr style="border-bottom:2px solid #f3f4f6">'
            f'<th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600">Symbol</th>'
            f'<th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Avg Cost</th>'
            f'<th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Current</th>'
            f'<th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">P&L %</th>'
            f'<th style="padding:8px 12px;text-align:right;color:#6b7280;font-weight:600">Event</th>'
            f'</tr></thead>'
            f'<tbody>{rows}</tbody></table></div>'
        )

    total    = len(opportunities) + len(pnl_alerts)
    subtitle = f"{total} alert{'s' if total != 1 else ''} for your portfolio"

    return (
        f'<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;'
        f'background:#f9fafb;margin:0;padding:24px">'
        f'<div style="max-width:620px;margin:0 auto;background:#fff;border-radius:16px;'
        f'overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,.08)">'
        f'<div style="background:linear-gradient(135deg,#10b981,#059669);padding:28px 28px 20px">'
        f'<h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Bullia Portfolio Alert</h1>'
        f'<p style="color:#d1fae5;margin:6px 0 0;font-size:14px">{subtitle}</p></div>'
        f'<div style="padding:24px">{opp_section}{pnl_section}'
        f'<div style="margin-top:24px;text-align:center">'
        f'<a href="{DASHBOARD_URL}" style="display:inline-block;background:#10b981;color:#fff;'
        f'padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">'
        f'Open Dashboard →</a></div></div>'
        f'<div style="padding:16px 28px;border-top:1px solid #f3f4f6;font-size:12px;'
        f'color:#9ca3af;text-align:right">Bullia · {now_str}</div></div>'
        f'</body></html>'
    )


def send_email(to_email: str, opportunities: list, pnl_alerts: list) -> bool:
    if not RESEND_API_KEY:
        print(f"  [skip] RESEND_API_KEY not set — would email {to_email}")
        return False

    all_syms     = [o["symbol"] for o in opportunities] + [a["symbol"] for a in pnl_alerts]
    preview_syms = list(dict.fromkeys(all_syms))[:3]
    extra        = len(set(all_syms)) - len(preview_syms)
    syms_str     = ", ".join(preview_syms) + (f" +{extra} more" if extra > 0 else "")

    if opportunities and not pnl_alerts:
        subject = f"💡 Opportunity signal: {syms_str}"
    elif pnl_alerts and not opportunities:
        subject = f"📊 P&L milestone: {syms_str}"
    else:
        subject = f"Bullia alert: {syms_str}"

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json={"from": FROM_EMAIL, "to": [to_email], "subject": subject,
              "html": build_email_html(opportunities, pnl_alerts)},
        timeout=15,
    )
    if resp.ok:
        print(f"  [ok] Sent → {to_email} (id={resp.json().get('id')})")
        return True
    print(f"  [err] Resend {resp.status_code}: {resp.text}")
    return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Active holdings with avg_cost
    resp = (
        sb.from_("portfolio_assets")
        .select("id, symbol, shares, avg_cost, portfolio_id, portfolios(user_id)")
        .filter("sold_at", "is", "null")
        .filter("avg_cost", "not.is", "null")
        .execute()
    )
    holdings = resp.data or []
    if not holdings:
        print("No active holdings with avg_cost — nothing to check.")
        return
    print(f"Checking {len(holdings)} holding(s) …")

    symbols = list({h["symbol"] for h in holdings})

    # 2. DB queries
    conn = psycopg2.connect(DATABASE_URL)
    try:
        price_map  = db_fetch_latest_prices(conn, symbols)
        rank_map   = db_fetch_rank_data(conn, symbols)
        accum_syms = db_fetch_accum_symbols(conn, symbols)
    finally:
        conn.close()

    print(f"Prices: {len(price_map)} | Ranked: {len(rank_map)} | Accum zone: {len(accum_syms)}")

    # 3. Previously fired alerts
    log_resp = (
        sb.from_("portfolio_alert_log")
        .select("id, user_id, symbol, alert_key, alerted_at")
        .execute()
    )
    now_utc    = datetime.now(timezone.utc)
    opp_cutoff = now_utc - timedelta(days=OPPORTUNITY_TTL_DAYS)

    pnl_sent: set = set()
    opp_sent: set = set()
    stale_ids: list = []

    for r in (log_resp.data or []):
        key = (r["user_id"], r["symbol"], r["alert_key"])
        is_pnl = r["alert_key"][0] in ("+", "-") and r["alert_key"][1:].lstrip("0123456789") == ""
        if is_pnl:
            pnl_sent.add(key)
        else:
            try:
                alerted_at = datetime.fromisoformat(r["alerted_at"].replace("Z", "+00:00"))
            except Exception:
                alerted_at = now_utc
            if alerted_at < opp_cutoff:
                stale_ids.append(r["id"])
            else:
                opp_sent.add(key)

    if stale_ids:
        sb.from_("portfolio_alert_log").delete().in_("id", stale_ids).execute()
        print(f"Cleared {len(stale_ids)} expired opportunity alert(s) (>{OPPORTUNITY_TTL_DAYS}d old).")

    # 4. Reset P&L alerts on reversal
    to_reset: list = []
    for r in (log_resp.data or []):
        ak = r["alert_key"]
        is_pnl = ak[0] in ("+", "-") and ak[1:].lstrip("0123456789") == ""
        if not is_pnl:
            continue
        current = price_map.get(r["symbol"])
        match = next(
            (h for h in holdings
             if h["symbol"] == r["symbol"] and h["portfolios"]["user_id"] == r["user_id"]),
            None,
        )
        if not match or current is None:
            continue
        avg_cost = float(match["avg_cost"])
        pct      = (current - avg_cost) / avg_cost * 100
        thr      = int(ak)
        reset_lvl = thr * 0.8
        fallen = (thr > 0 and pct < reset_lvl) or (thr < 0 and pct > reset_lvl)
        if fallen:
            to_reset.append((r["user_id"], r["symbol"], ak))

    for uid, sym, ak in to_reset:
        sb.from_("portfolio_alert_log").delete().eq("user_id", uid).eq("symbol", sym).eq("alert_key", ak).execute()
        pnl_sent.discard((uid, sym, ak))
    if to_reset:
        print(f"Reset {len(to_reset)} P&L alert(s) (reverted below threshold).")

    # 5. Evaluate per user
    by_user: dict = defaultdict(list)
    for h in holdings:
        by_user[h["portfolios"]["user_id"]].append(h)

    total_emails = 0

    for user_id, user_holdings in by_user.items():
        pnl_triggered: list = []
        opp_triggered: list = []
        new_log: list = []

        for h in user_holdings:
            symbol   = h["symbol"]
            avg_cost = float(h["avg_cost"])
            shares   = float(h.get("shares") or 0)
            current  = price_map.get(symbol)
            if current is None:
                continue
            pct  = (current - avg_cost) / avg_cost * 100
            rank = rank_map.get(symbol, {})

            # P&L milestone check
            for thr in ALL_THRESHOLDS:
                ak  = f"{thr:+d}"
                key = (user_id, symbol, ak)
                crossed = (thr > 0 and pct >= thr) or (thr < 0 and pct <= thr)
                if crossed and key not in pnl_sent:
                    pnl_triggered.append({
                        "symbol": symbol, "pct_chg": pct, "threshold": thr,
                        "current": current, "avg_cost": avg_cost, "shares": shares,
                    })
                    new_log.append({"user_id": user_id, "symbol": symbol, "alert_key": ak})
                    pnl_sent.add(key)

            # Opportunity signal check
            signals: list = []

            score_delta = rank.get("score_delta")
            if score_delta is not None and float(score_delta) > 0.05:
                ak, key = "score_upgrade", (user_id, symbol, "score_upgrade")
                if key not in opp_sent:
                    signals.append(ak)
                    new_log.append({"user_id": user_id, "symbol": symbol, "alert_key": ak})
                    opp_sent.add(key)

            if symbol in accum_syms:
                ak, key = "accum_zone", (user_id, symbol, "accum_zone")
                if key not in opp_sent:
                    signals.append(ak)
                    new_log.append({"user_id": user_id, "symbol": symbol, "alert_key": ak})
                    opp_sent.add(key)

            mom_1w = rank.get("mom_1w")
            mom_1m = rank.get("mom_1m")
            if mom_1w is not None and float(mom_1w) > 0 and mom_1m is not None and float(mom_1m) < 0:
                ak, key = "mom_recovery", (user_id, symbol, "mom_recovery")
                if key not in opp_sent:
                    signals.append(ak)
                    new_log.append({"user_id": user_id, "symbol": symbol, "alert_key": ak})
                    opp_sent.add(key)

            if signals:
                print(f"  {symbol}: signals={signals}")
                opp_triggered.append({
                    "symbol": symbol, "name": rank.get("name") or "",
                    "pct_chg": pct, "current": current, "avg_cost": avg_cost,
                    "shares": shares, "signals": signals, "ai": "", "rank": rank,
                })

        if not pnl_triggered and not opp_triggered:
            continue

        # Fetch AI analysis in a single batch call (one prompt for all stocks)
        if opp_triggered and OPENROUTER_KEY:
            print(f"  Fetching AI batch analysis for {len(opp_triggered)} stock(s) …")
            ai_results = get_ai_analysis_batch(opp_triggered)
            for o in opp_triggered:
                o["ai"] = ai_results.get(o["symbol"], "")

        # Resolve destination email.
        # Always use ALERT_EMAIL for now — avoids Resend's test-domain restriction
        # (onboarding@resend.dev can only send to the Resend account owner's address).
        # When you verify a domain at resend.com/domains and update FROM_EMAIL,
        # replace this with: sb.auth.admin.get_user_by_id(user_id).user.email
        to_email = FALLBACK_EMAIL
        if not to_email:
            print(f"  [warn] ALERT_EMAIL secret not set — skipping user {user_id[:8]}")
            continue

        print(f"User {user_id[:8]}: {len(opp_triggered)} opportunity / {len(pnl_triggered)} P&L → {to_email}")

        if send_email(to_email, opp_triggered, pnl_triggered):
            if new_log:
                sb.from_("portfolio_alert_log").upsert(
                    new_log, on_conflict="user_id,symbol,alert_key"
                ).execute()
            total_emails += 1

    print(f"\nDone — emails sent: {total_emails}")


if __name__ == "__main__":
    main()
