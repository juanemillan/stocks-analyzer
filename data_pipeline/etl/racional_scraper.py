"""
etl/racional_scraper.py
Racional portfolio scraper - Firebase REST auth + Playwright portfolio read.

Strategy
--------
1. Authenticate via Firebase Identity Toolkit REST API (plain HTTP POST -
   identical to what Racional's Angular app does internally).  Firebase never
   sees a browser, so there is no bot-detection / suspicious-login alert.

2. Inject the resulting Firebase idToken + user data directly into the
   Playwright browser's localStorage, then navigate to the home page.
   Angular finds a valid session and renders the stock cards without ever
   showing the login form.

3. For each stock card (app-stock-card[data-asset-id]), click to open the
   detail panel, extract shares ("Acciones") and avg_cost ("Costo promedio")
   from the rendered innerText, then go_back() to the home page.

Confirmed via DOM inspection (April 2026):
  - Home page: app-stock-card elements with data-asset-id="TURB" etc.
  - Detail panel (slide-in, URL unchanged): innerText contains
      "Acciones\n83,93236298\n...Costo promedio\nUS$2,38"
"""

import json
import os
import re
import time
from typing import Optional
import urllib.request
import urllib.error

try:
    from playwright.sync_api import sync_playwright, Page, TimeoutError as PWTimeout
except ImportError:
    raise SystemExit(
        "playwright not installed.\n"
        "Run: pip install playwright && python -m playwright install chromium"
    )

# -- Config -------------------------------------------------------------------
HEADLESS       = True            # set False to visually debug
APP_URL        = "https://app.racional.cl"
NAV_TIMEOUT    = 35_000          # ms
WAIT_TIMEOUT   = 20_000          # ms
POST_NAV_WAIT  = 5.0             # seconds - let Angular + Firebase hydrate on home page

# Racional's Firebase project config (read from environment / .env)
FIREBASE_API_KEY  = os.environ.get("RACIONAL_FIREBASE_API_KEY", "")
if not FIREBASE_API_KEY:
    raise SystemExit("RACIONAL_FIREBASE_API_KEY not set. Add it to your .env file.")
FIREBASE_AUTH_URL = (
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
    f"?key={FIREBASE_API_KEY}"
)


# -- Step 1: Firebase REST login (no browser) ---------------------------------
def firebase_login(email: str, password: str) -> dict:
    """
    Authenticate against Firebase via HTTP POST.
    Returns the full Firebase auth payload on success,
    raises RuntimeError with a human-readable message on failure.
    """
    payload = json.dumps({
        "email":             email,
        "password":          password,
        "returnSecureToken": True,
    }).encode()

    req = urllib.request.Request(
        FIREBASE_AUTH_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        code = body.get("error", {}).get("message", "UNKNOWN")
        if code in ("EMAIL_NOT_FOUND", "INVALID_EMAIL"):
            raise RuntimeError("Email no registrado en Racional.")
        if code in ("INVALID_PASSWORD", "INVALID_LOGIN_CREDENTIALS"):
            raise RuntimeError("Contrasena incorrecta.")
        if code == "USER_DISABLED":
            raise RuntimeError("Cuenta deshabilitada.")
        if code == "TOO_MANY_ATTEMPTS_TRY_LATER":
            raise RuntimeError("Demasiados intentos fallidos. Intenta mas tarde.")
        raise RuntimeError(f"Firebase auth error: {code}")
    except Exception as e:
        raise RuntimeError(f"No se pudo conectar a Firebase: {e}")


# -- Step 2: inject token into Playwright, read portfolio ---------------------
def fetch_portfolio(auth_data: dict) -> list[dict]:
    """
    Opens a Playwright browser, injects Firebase session into localStorage,
    navigates to the home page, and extracts holdings by clicking each stock card.
    """
    id_token      = auth_data["idToken"]
    refresh_token = auth_data["refreshToken"]
    uid           = auth_data["localId"]
    email         = auth_data["email"]
    expires_in    = int(auth_data.get("expiresIn", 3600))
    expiry_time   = int(time.time()) + expires_in

    firebase_key  = f"firebase:authUser:{FIREBASE_API_KEY}:[DEFAULT]"
    firebase_user = json.dumps({
        "uid":           uid,
        "email":         email,
        "emailVerified": auth_data.get("emailVerified", True),
        "displayName":   auth_data.get("displayName", ""),
        "isAnonymous":   False,
        "providerData": [{
            "providerId":  "password",
            "uid":         email,
            "email":       email,
            "displayName": auth_data.get("displayName", ""),
            "phoneNumber": None,
            "photoURL":    None,
        }],
        "stsTokenManager": {
            "refreshToken":   refresh_token,
            "accessToken":    id_token,
            "expirationTime": expiry_time * 1000,
        },
        "createdAt":   auth_data.get("createdAt", ""),
        "lastLoginAt": auth_data.get("lastLoginAt", ""),
        "apiKey":      FIREBASE_API_KEY,
        "appName":     "[DEFAULT]",
    })

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=HEADLESS,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-infobars",
            ],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/131.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="es-CL",
            timezone_id="America/Santiago",
            extra_http_headers={"Accept-Language": "es-CL,es;q=0.9,en;q=0.8"},
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
            "window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){}, app: {} };"
        )

        page = context.new_page()

        # Land on origin first so localStorage is scoped to the right domain
        page.goto(APP_URL, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        page.evaluate("([k,v]) => localStorage.setItem(k,v)", [firebase_key, firebase_user])

        # Reload - Angular finds the session and navigates to home
        page.goto(APP_URL, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
        time.sleep(POST_NAV_WAIT)

        holdings = _extract_holdings(page)
        browser.close()

    return holdings


def _parse_spanish_number(s: str) -> Optional[float]:
    """Convert a Spanish-locale number string to float.
    Handles: '83,93236298', 'US$2,38', 'US$20.551,10'
    """
    s = s.replace("US$", "").strip()
    if not s:
        return None
    # dot=thousands, comma=decimal when both present
    if "." in s and "," in s:
        s = s.replace(".", "").replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _expand_all_cards(page: Page) -> int:
    """
    Click 'Ver más' ONCE to reveal all holding cards, then wait for count to
    stabilize.  The button is a TOGGLE — clicking it a second time would
    collapse cards back to the initial ~5.  We break as soon as count increases.
    Angular resets to ~5 cards on every navigation, so this must be called
    again after each page.goto(APP_URL).
    """
    CARD_SELECTOR = "app-stock-card[data-asset-id]"

    count_before = page.evaluate(
        "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
    )

    ver_mas = page.query_selector("app-expand-icon-button .expand-button")
    if not ver_mas:
        print(f"   [expand] no expand button found — {count_before} cards already visible")
        return count_before

    print(f"   [expand] clicking 'Ver más' (cards so far: {count_before})")
    ver_mas.click()

    try:
        page.wait_for_function(
            f"() => document.querySelectorAll('app-stock-card[data-asset-id]').length > {count_before}",
            timeout=8_000,
        )
    except PWTimeout:
        total = page.evaluate(
            "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
        )
        print(f"   [expand] no increase after 8s — {total} cards visible")
        return total

    # Wait up to 5s for any remaining lazy-loaded cards to settle
    for _ in range(5):
        time.sleep(1.0)
        count_now = page.evaluate(
            "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
        )
        if count_now == page.evaluate(
            "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
        ):
            break  # stable

    total = page.evaluate(
        "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
    )
    print(f"   [expand] expanded: {count_before} → {total} cards")
    return total


def _extract_holdings(page: Page) -> list[dict]:
    """
    Confirmed strategy (DOM-inspected April 2026):
      1. Home page has app-stock-card elements with data-asset-id per holding.
      2. Angular only shows ~5 cards initially; 'Ver más' button reveals more.
         IMPORTANT: After each go_back() Angular resets to the initial ~5 cards,
         so _expand_all_cards() must be called again before looking for the next card.
      3. Clicking a card opens a slide-in detail panel (URL stays unchanged).
         The panel's innerText contains:
             Acciones
             83,93236298        <- shares
             ...
             Costo promedio
             US$2,38            <- avg_cost
      4. page.go_back() closes the panel and returns to home.
    """
    CARD_SELECTOR = "app-stock-card[data-asset-id]"

    try:
        page.wait_for_selector(CARD_SELECTOR, timeout=WAIT_TIMEOUT)
    except PWTimeout:
        print("WARNING: No app-stock-card elements found — is the user logged in?")
        return []

    # First full expansion — collect complete ticker list
    print("--- Phase 1: expanding full card list ---")
    _expand_all_cards(page)

    tickers = page.evaluate("""() =>
        Array.from(document.querySelectorAll('app-stock-card[data-asset-id]'))
            .map(el => el.getAttribute('data-asset-id'))
            .filter(Boolean)
    """)
    total_tickers = len(tickers)
    print(f"   Ticker list ({total_tickers}): {tickers}")

    # Phase 2: click each card, extract data
    print(f"--- Phase 2: scraping detail for {total_tickers} asset(s) ---")
    holdings = []
    for i, ticker in enumerate(tickers, 1):
        print(f"   [{i}/{total_tickers}] Processing {ticker} ...")
        try:
            card = page.query_selector(f"app-stock-card[data-asset-id='{ticker}']")
            if not card:
                # Cards might still be rendering after a slow navigation — wait first
                try:
                    page.wait_for_selector(CARD_SELECTOR, timeout=10_000)
                except PWTimeout:
                    pass
                visible = page.evaluate(
                    "() => document.querySelectorAll('app-stock-card[data-asset-id]').length"
                )
                print(f"   [{i}/{total_tickers}] Card not found (only {visible} visible) — re-expanding ...")
                _expand_all_cards(page)
                card = page.query_selector(f"app-stock-card[data-asset-id='{ticker}']")
                if not card:
                    print(f"   [{i}/{total_tickers}] Still not found after re-expand — skipping {ticker}")
                    continue

            card.click()

            # Wait until detail panel has loaded its data
            try:
                page.wait_for_function(
                    "() => document.body.innerText.includes('Acciones')",
                    timeout=WAIT_TIMEOUT,
                )
            except PWTimeout:
                print(f"   [{i}/{total_tickers}] Detail panel timed out for {ticker} — skipping")
                page.go_back()
                time.sleep(2.0)
                continue

            # Small extra wait for animated counter to settle
            time.sleep(1.0)

            body_text = page.evaluate("() => document.body.innerText")

            shares_m = re.search(r"Acciones\s*\n([\d.,]+)", body_text)
            shares = _parse_spanish_number(shares_m.group(1)) if shares_m else None

            avg_m = re.search(r"Costo promedio\s*\n(US\$[\d.,]+)", body_text)
            avg_cost = _parse_spanish_number(avg_m.group(1)) if avg_m else None

            print(f"   [{i}/{total_tickers}] {ticker}: shares={shares}, avg_cost={avg_cost}")

            if shares is None:
                print(f"   [{i}/{total_tickers}] WARNING: could not parse 'Acciones' for {ticker}")
                print(f"   Body snippet: {body_text[:300]!r}")

            if shares and shares > 0:
                holdings.append({
                    "symbol":   ticker.upper(),
                    "shares":   shares,
                    "avg_cost": avg_cost,
                })

        except Exception as e:
            print(f"   [{i}/{total_tickers}] ERROR scraping {ticker}: {e}")
        finally:
            # Navigate directly back to home — more reliable than go_back() for
            # Angular slide-in panels that don't push a browser history entry.
            try:
                print(f"   [{i}/{total_tickers}] Navigating back to home ...")
                page.goto(APP_URL, wait_until="domcontentloaded", timeout=NAV_TIMEOUT)
                time.sleep(2.0)  # let Angular hydrate and render cards
                page.wait_for_selector(CARD_SELECTOR, timeout=12_000)
                # Cards always collapse back to ~5 after a full navigation — re-expand
                _expand_all_cards(page)
            except Exception as nav_err:
                print(f"   [{i}/{total_tickers}] Navigation error after {ticker}: {nav_err}")
                # Recovery: Angular may just need more time to hydrate — wait and retry once
                try:
                    time.sleep(6.0)
                    page.wait_for_selector(CARD_SELECTOR, timeout=20_000)
                    _expand_all_cards(page)
                    print(f"   [{i}/{total_tickers}] Navigation recovery successful")
                except Exception:
                    pass  # next iteration's card-not-found logic will handle it

    print(f"--- Scrape complete: {len(holdings)}/{total_tickers} holdings extracted ---")
    return {"holdings": holdings, "all_tickers": [t.upper() for t in tickers]}


# -- Top-level runner ---------------------------------------------------------
def run_scrape(email: Optional[str] = None, password: Optional[str] = None) -> dict:
    """
    Returns:
        {"success": True,  "holdings": [...], "count": N}
        {"success": False, "error": "..."}
    """
    email    = email    or os.environ.get("RACIONAL_EMAIL")
    password = password or os.environ.get("RACIONAL_PASSWORD")

    if not email or not password:
        return {"success": False, "error": "RACIONAL_EMAIL / RACIONAL_PASSWORD not configured"}

    print(f"Authenticating {email} via Firebase REST ...")
    try:
        auth_data = firebase_login(email, password)
    except RuntimeError as e:
        return {"success": False, "error": str(e)}

    print(f"Auth OK (uid {auth_data['localId'][:8]}...). Opening portfolio ...")

    try:
        fetch_result = fetch_portfolio(auth_data)
    except Exception as e:
        return {"success": False, "error": f"Portfolio scrape error: {e}"}

    holdings    = fetch_result["holdings"]
    all_tickers = fetch_result["all_tickers"]

    if not holdings:
        return {
            "success": False,
            "error": (
                "Autenticacion exitosa pero se encontraron 0 posiciones. "
                "Configura HEADLESS=False en etl/racional_scraper.py para inspeccionar el DOM."
            ),
        }

    print(f"Success: {len(holdings)} holding(s): {[h['symbol'] for h in holdings]}")
    return {"success": True, "holdings": holdings, "all_tickers": all_tickers, "count": len(holdings)}