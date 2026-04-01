from utils import get_connection
import pandas as pd

def upsert_assets_from_csv(csv_path: str):
    conn = get_connection()
    cur = conn.cursor()

    df = pd.read_csv(csv_path)
    df = df.rename(columns={"Simbolo": "symbol", "Nombre": "name", "Tipo": "asset_type", "URL": "racional_url"})
    required = ["symbol", "name", "asset_type", "racional_url"]

    for _, row in df.iterrows():
        cur.execute("""
            INSERT INTO assets (symbol, name, asset_type, racional_url)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (symbol)
            DO UPDATE SET
                name = EXCLUDED.name,
                asset_type = EXCLUDED.asset_type,
                racional_url = EXCLUDED.racional_url;
        """, (row["symbol"], row["name"], row["asset_type"], row["racional_url"]))

    conn.commit()
    conn.close()
    print("✅ Assets actualizados.")
