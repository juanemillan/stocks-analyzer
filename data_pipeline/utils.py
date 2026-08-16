# data_pipeline/utils.py
import os
import time
import psycopg2
from dotenv import load_dotenv

def get_connection():
    """
    Retorna una conexión a la base de datos Cockroach/Postgres.
    Requiere que DATABASE_URL esté en el archivo .env.
    """
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("Falta DATABASE_URL en el archivo .env")
    # psycopg2 doesn't support sslmode=no-verify; replace with sslmode=require
    db_url = db_url.replace("sslmode=no-verify", "sslmode=require")
    for attempt in range(3):
        try:
            conn = psycopg2.connect(db_url)
            conn.autocommit = True
            return conn
        except psycopg2.OperationalError as error:
            message = str(error).lower()
            transient = any(token in message for token in (
                "timeout", "connection refused", "connection reset", "server closed", "could not connect",
            ))
            if not transient or attempt == 2:
                raise
            delay = attempt + 1
            print(f"⚠️  Base de datos no disponible; reintentando en {delay}s ({attempt + 1}/3)...")
            time.sleep(delay)
