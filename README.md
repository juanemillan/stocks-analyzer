# Bullia / stocks-analyzer

Monorepo de análisis de acciones con dos componentes:

- `data_pipeline/`: ETL y cálculos en Python sobre PostgreSQL/CockroachDB.
- `dashboard/`: aplicación Next.js 16 con autenticación y datos de usuario en Supabase.

El pipeline actualiza precios, recalcula señales y genera insights. El dashboard muestra ranking, estrategias, portfolio, alertas y chat financiero.

## Inicio rápido

Requisitos: Node.js 22.19 o superior, npm y Python 3.11.

```powershell
git clone <repo>
cd stocks-analyzer
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd dashboard
npm ci
```

Configura `dashboard/.env.local` y un `.env` local para el pipeline. Nunca commitees credenciales. La lista completa de variables, el orden de ejecución, las migraciones, pruebas y despliegues están en [docs/PROJECT_PROCESS.md](docs/PROJECT_PROCESS.md).

## Comprobaciones antes de push

```powershell
cd dashboard
npx tsc --noEmit
npm test
npm run lint
npm run build
cd ..
powershell -ExecutionPolicy Bypass -File .\scripts\check-unwise-caches.ps1
```

El pipeline principal también debe validarse con:

```powershell
python data_pipeline/main.py --status
python -m compileall -q data_pipeline
```

## Documentación

- [Proceso completo del proyecto](docs/PROJECT_PROCESS.md)
- [Diseño visual](DESIGN.md)
- [Diagnóstico de cachés](docs/DEV_GUIDE.md)
- [Dashboard](dashboard/README.md)
