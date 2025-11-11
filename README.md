# stocks-analyzer

Monorepo para:
- **dashboard/** (Next.js + Supabase)
- **etl/** (Python: yfinance ? Supabase)
- **sql/** (vistas, funciones, MVs)

## Entornos
- .env.local en dashboard/ (SUPABASE_URL/ANON_KEY, etc.)
- .env en etl/ (SUPABASE_URL/SUPABASE_KEY)

**No** commitear .env*.
