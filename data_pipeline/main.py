import argparse
import sys
import io
import os

# Always resolve paths relative to this file's directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from etl.seed_assets import seed_assets
from etl.fetch_prices import main as fetch_prices_main
from etl.update_prices_incremental import main as update_prices_main
from etl.scores import compute_scores
from etl.enrich_assets import enrich_assets
from etl.enrich_from_racional import enrich_from_racional
from utils import get_connection


def apply_sql_file(sql_path: str):
    """Ejecuta todos los statements de un archivo SQL.
    Si el archivo contiene bloques $$...$$, lo ejecuta como un solo statement."""
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_text = f.read()
    conn = get_connection()
    cur = conn.cursor()

    # Files with dollar-quoting (functions) must be executed as one statement
    if "$$" in sql_text:
        try:
            cur.execute(sql_text)
            conn.commit()
            print(f"  ✅ {sql_path} aplicado ok")
        except Exception as e:
            print(f"  ⚠️  Error: {e}")
            conn.rollback()
    else:
        for stmt in [s.strip() for s in sql_text.split(";") if s.strip()]:
            try:
                cur.execute(stmt)
                conn.commit()
                print(f"  ✅ {stmt.splitlines()[0][:70]}")
            except Exception as e:
                print(f"  ⚠️  Error: {e}")
                conn.rollback()
    cur.close()
    conn.close()


def quick_status():
    """Devuelve resumen de estado de las tablas principales."""
    conn = get_connection()
    cur = conn.cursor()

    def count(tbl):
        cur.execute(f"SELECT COUNT(*) FROM {tbl};")
        return cur.fetchone()[0]

    cur.execute("SELECT MAX(date) FROM prices_daily;")
    last_price_date = cur.fetchone()[0]

    cur.execute("SELECT MAX(date) FROM scores_daily;")
    last_score_date = cur.fetchone()[0]

    print("\n📊 Estado actual de la base de datos")
    print("-----------------------------------")
    print(f"Assets:              {count('assets')}")
    print(f"Prices (rows):       {count('prices_daily')}")
    print(f"Scores (rows):       {count('scores_daily')}")
    print(f"Última fecha precios: {last_price_date}")
    print(f"Última fecha scores:  {last_score_date}")

    cur.close()
    conn.close()


def add_asset(symbol: str, name: str | None, asset_type: str):
    """Inserts an asset manually and fetches its full price history."""
    import yfinance as yf
    import pandas as pd
    import math
    import numpy as np

    symbol = symbol.strip().upper()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO assets (symbol, name, asset_type, is_active)
        VALUES (%s, %s, %s, TRUE)
        ON CONFLICT (symbol) DO UPDATE
            SET name = COALESCE(EXCLUDED.name, assets.name),
                asset_type = EXCLUDED.asset_type,
                is_active = TRUE,
                updated_at = now()
        """,
        (symbol, name, asset_type),
    )
    conn.commit()
    print(f"  ✅ Asset '{symbol}' upserted in assets table.")

    # Fetch full history from yfinance
    print(f"  ⬇️  Fetching price history for {symbol}...")
    hist = yf.Ticker(symbol).history(start="2021-01-01", interval="1d", auto_adjust=True)
    if hist is None or hist.empty:
        print(f"  ⚠️  No price data found for {symbol} on Yahoo Finance.")
        cur.close()
        conn.close()
        return

    hist = hist.reset_index()
    hist.columns = [c.lower() for c in hist.columns]
    if "date" not in hist.columns:
        hist = hist.rename(columns={hist.columns[0]: "date"})
    hist = hist.dropna(subset=["open", "high", "low", "close"])
    if "volume" not in hist.columns:
        hist["volume"] = None

    def safe(v):
        if isinstance(v, (float, np.floating)):
            return float(v) if math.isfinite(float(v)) else None
        return v

    rows = [
        (
            symbol,
            str(pd.to_datetime(r["date"]).date()),
            safe(r["open"]), safe(r["high"]), safe(r["low"]), safe(r["close"]),
            int(r["volume"]) if pd.notna(r.get("volume")) else None,
        )
        for _, r in hist.iterrows()
    ]

    args_str = ",".join(
        cur.mogrify("(%s,%s,%s,%s,%s,%s,%s)", row).decode() for row in rows
    )
    cur.execute(f"""
        INSERT INTO prices_daily (symbol, date, open, high, low, close, volume)
        VALUES {args_str}
        ON CONFLICT (symbol, date) DO UPDATE SET
            open = EXCLUDED.open, high = EXCLUDED.high,
            low = EXCLUDED.low, close = EXCLUDED.close,
            volume = EXCLUDED.volume;
    """)
    conn.commit()
    print(f"  ✅ Inserted {len(rows)} price rows for {symbol}.")
    cur.close()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Orquestador ETL Stocks Analyzer")
    parser.add_argument("--seed", action="store_true", help="Cargar activos desde Google Sheets (Racional)")
    parser.add_argument("--fetch", action="store_true", help="Descargar precios históricos (lento)")
    parser.add_argument("--update", action="store_true", help="Actualizar precios recientes (incremental)")
    parser.add_argument("--scores", action="store_true", help="Recalcular scores diarios/avanzados")
    parser.add_argument("--status", action="store_true", help="Ver estado actual de la base de datos")
    parser.add_argument("--views", action="store_true", help="Aplicar/actualizar vistas SQL (02_views.sql)")
    parser.add_argument("--add-asset", metavar="SYMBOL", help="Añadir activo manualmente y descargar su historial")
    parser.add_argument("--name", metavar="NAME", help="Nombre del activo (opcional, usar con --add-asset)")
    parser.add_argument("--type", metavar="TYPE", default="EQUITY", choices=["EQUITY", "ETF", "FUND", "OTHER"], help="Tipo de activo (default: EQUITY)")
    parser.add_argument("--enrich", action="store_true", help="Enriquecer activos con metadata (descripción, sector, web…)")
    parser.add_argument("--enrich-racional", action="store_true", help="Scrape descripciones desde Racional (Playwright)")
    parser.add_argument("--symbol", metavar="SYMBOL", help="Símbolo concreto (usar con --enrich)")
    parser.add_argument("--missing-only", action="store_true", help="Solo enriquecer activos sin descripción (usar con --enrich)")

    args = parser.parse_args()

    if args.seed:
        print("🚀 Sembrando activos desde Google Sheets...")
        seed_assets()

    elif args.fetch:
        print("⬇️  Descargando histórico completo de precios...")
        fetch_prices_main()

    elif args.update:
        print("🔁 Actualizando precios incrementales...")
        update_prices_main()

    elif args.scores:
        print("🧮 Calculando scores avanzados...")
        compute_scores()

    elif args.status:
        quick_status()

    elif args.views:
        print("🗂️  Aplicando vistas SQL...")
        apply_sql_file("sql/02_views.sql")
        apply_sql_file("sql/04_turnaround_explosives.sql")
        apply_sql_file("sql/06_accumulation_zone.sql")
        print("🏁 Vistas actualizadas.")

    elif args.add_asset:
        add_asset(args.add_asset, args.name, args.type)

    elif args.enrich:
        print("📚 Enriqueciendo metadata de activos (yfinance)...")
        apply_sql_file("sql/05_enrich_assets.sql")   # ensure columns exist
        enrich_assets(
            symbol_filter=getattr(args, "symbol", None),
            missing_only=getattr(args, "missing_only", False),
        )
        print("🗂️  Actualizando vista v_assets_rank...")
        apply_sql_file("sql/02_views.sql")
        print("🏁 Hecho.")

    elif args.enrich_racional:
        print("🌐 Scrapeando descripciones desde Racional (Playwright)...")
        apply_sql_file("sql/05_enrich_assets.sql")   # ensure columns exist
        enrich_from_racional(
            symbol_filter=getattr(args, "symbol", None),
            missing_only=getattr(args, "missing_only", False),
        )
        print("🗂️  Actualizando vista v_assets_rank...")
        apply_sql_file("sql/02_views.sql")
        print("🏁 Hecho.")

    else:
        parser.print_help()


if __name__ == "__main__":
    sys.exit(main())
