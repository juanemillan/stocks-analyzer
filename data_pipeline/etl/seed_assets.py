import os
import math
import pandas as pd
from dotenv import load_dotenv
from utils import get_connection

# Config
SHEETS_URL = "https://docs.google.com/spreadsheets/d/1Xm3AtWMAlIeGgSXFgmNBBuT5-nCZOA3-oUIPKEvs7t0/export?format=csv&gid=1252429986"
BATCH_SIZE = 500


def clean_symbol(s: str) -> str:
    if pd.isna(s):
        return ""
    s = str(s).strip().upper().replace(" ", "")
    replacements = {"BRK.B": "BRK-B", "BRK/B": "BRK-B", "BF.B": "BF-B", "BF/B": "BF-B"}
    return replacements.get(s, s)


def map_type(t):
    if pd.isna(t):
        return "OTHER"
    t = str(t).strip().upper()
    if t in {"STOCK", "ACCION", "ACCIONES", "EQUITY"}:
        return "EQUITY"
    if t == "ETF":
        return "ETF"
    if t in {"FUND", "FONDO", "MUTUAL FUND"}:
        return "FUND"
    return "OTHER"


def seed_assets(csv_path: str = SHEETS_URL):
    df = pd.read_csv(csv_path).rename(
        columns={
            "Simbolo": "symbol",
            "Símbolo": "symbol",
            "Nombre": "name",
            "Tipo": "asset_type",
            "URL": "racional_url",
        }
    )

    df["symbol"] = df["symbol"].apply(clean_symbol)
    df = df[df["symbol"] != ""].drop_duplicates(subset=["symbol"], keep="first")
    df["asset_type"] = df["asset_type"].apply(map_type)
    df["name"] = df["name"].where(pd.notna(df["name"]), None)
    df["racional_url"] = df["racional_url"].where(pd.notna(df["racional_url"]), None)

    conn = get_connection()
    cur = conn.cursor()

    records = [
        (
            row["symbol"],
            row["name"],
            row["asset_type"],
            row["racional_url"],
            True,
        )
        for _, row in df.iterrows()
    ]

    total = len(records)
    batches = math.ceil(total / BATCH_SIZE)
    inserted = 0

    for i in range(batches):
        chunk = records[i * BATCH_SIZE : (i + 1) * BATCH_SIZE]
        args_str = ",".join(cur.mogrify("(%s,%s,%s,%s,%s)", rec).decode() for rec in chunk)
        cur.execute(f"""
            INSERT INTO assets (symbol, name, asset_type, racional_url, is_active)
            VALUES {args_str}
            ON CONFLICT (symbol)
            DO UPDATE SET
                name = EXCLUDED.name,
                asset_type = EXCLUDED.asset_type,
                racional_url = EXCLUDED.racional_url,
                is_active = TRUE;
        """)
        inserted += len(chunk)
        print(f"Lote {i+1}/{batches} → upsert {len(chunk)} (acum: {inserted}/{total})")

    print("✅ Carga completa de assets.")

    # --- Opcional: symbol_map 1:1
    try:
        cur.execute("""
            INSERT INTO symbol_map (symbol, yf_symbol)
            SELECT symbol, symbol FROM assets
            ON CONFLICT (symbol) DO NOTHING;
        """)
        print("symbol_map sembrado 1:1 ✓")
    except Exception as e:
        print("⚠️  No se pudo sembrar symbol_map:", e)

    conn.commit()
    cur.close()
    conn.close()
