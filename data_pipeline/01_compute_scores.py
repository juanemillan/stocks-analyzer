from utils import get_connection

def main():
    sql_path = "sql/01_compute_scores_daily.sql"
    print(f"⚙️  Ejecutando {sql_path}...")

    with open(sql_path, "r", encoding="utf-8") as f:
        sql_text = f.read()

    conn = get_connection()
    cur = conn.cursor()

    statements = [s.strip() for s in sql_text.split(";") if s.strip()]
    for stmt in statements:
        try:
            cur.execute(stmt)
            conn.commit()
        except Exception as e:
            print("⚠️ Error ejecutando bloque:", e)
            conn.rollback()

    cur.close()
    conn.close()
    print("✅ Scores recalculados correctamente en CockroachDB.")

if __name__ == "__main__":
    main()
