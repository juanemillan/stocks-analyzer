import argparse
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")
from etl.seed_assets import seed_assets
from etl.fetch_prices import main as fetch_prices_main
from etl.update_prices_incremental import main as update_prices_main
from etl.scores import compute_scores
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


def main():
    parser = argparse.ArgumentParser(description="Orquestador ETL Stocks Analyzer")
    parser.add_argument("--seed", action="store_true", help="Cargar activos desde Google Sheets (Racional)")
    parser.add_argument("--fetch", action="store_true", help="Descargar precios históricos (lento)")
    parser.add_argument("--update", action="store_true", help="Actualizar precios recientes (incremental)")
    parser.add_argument("--scores", action="store_true", help="Recalcular scores diarios/avanzados")
    parser.add_argument("--status", action="store_true", help="Ver estado actual de la base de datos")
    parser.add_argument("--views", action="store_true", help="Aplicar/actualizar vistas SQL (02_views.sql)")

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
        print("🏁 Vistas actualizadas.")

    else:
        parser.print_help()


if __name__ == "__main__":
    sys.exit(main())
