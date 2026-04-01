# data_pipeline/utils.py
import os
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
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    return conn
