from utils import get_connection

def main():
    sql_path = "sql/00_schema.sql"
    print(f"⚙️  Creando tablas desde {sql_path}...")

    with open(sql_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    conn = get_connection()
    cur = conn.cursor()

    # Dividir por punto y coma y ejecutar cada bloque
    statements = [s.strip() for s in schema_sql.split(";") if s.strip()]
    for stmt in statements:
        try:
            cur.execute(stmt)
            conn.commit()
            print(f"✅ Ejecutado: {stmt.splitlines()[0][:60]}...")
        except Exception as e:
            print(f"⚠️ Error ejecutando statement: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print("🏁 Esquema creado correctamente.")

if __name__ == "__main__":
    main()
