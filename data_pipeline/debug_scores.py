import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from utils import get_connection
import os

conn = get_connection()
cur = conn.cursor()

# Test the interval syntax used in the actual SQL file
try:
    cur.execute("SELECT MAX(date) - interval '370 days' FROM prices_daily")
    print("interval '370 days' syntax:", cur.fetchone())
except Exception as e:
    print("interval syntax error:", e)
    conn.rollback()

# Run the actual SQL body and capture rowcount
with open("sql/03_compute_scores_advanced.sql", "r", encoding="utf-8") as f:
    full_sql = f.read()

parts = full_sql.split("$$")
print(f"parts: {len(parts)}")
body = parts[1].strip()
print("body starts with:", repr(body[:60]))

try:
    cur.execute(body)
    print("rowcount:", cur.rowcount)
    conn.commit()
except Exception as e:
    print("execute error:", e)
    conn.rollback()

cur.execute("SELECT COUNT(*) FROM scores_daily")
print("scores_daily count:", cur.fetchone())

conn.close()

