# Proceso del proyecto Bullia

## 1. Arquitectura y flujo de datos

```text
yfinance / proveedores externos
            |
            v
data_pipeline (Python) ---> PostgreSQL/CockroachDB
            |                        |
            |                        v
            +-----------------> Next.js dashboard
            |
            +-----------------> Supabase
                                  |- Auth
                                  |- portfolios / alertas / snapshots
                                  `- insights diarios
```

El código de scoring y mercado vive en `data_pipeline/`; los datos privados de usuario y las notificaciones viven en Supabase. El dashboard consulta ambos sistemas desde acciones de servidor y rutas API.

## 2. Componentes

### Pipeline

- `data_pipeline/main.py`: orquestador (`--seed`, `--fetch`, `--update`, `--scores`, `--status`, `--views`, `--add-asset` y opciones de enriquecimiento/sincronización).
- `data_pipeline/etl/`: universo de activos, precios, enriquecimiento y scores.
- `data_pipeline/fetch_intraday.py`: actualización intradía.
- `data_pipeline/generate_insights.py`: insight nocturno vía OpenRouter y persistencia en Supabase.
- `data_pipeline/snapshot_portfolio.py`: snapshots de portfolios.
- `data_pipeline/check_portfolio_alerts.py`: evaluación y envío de alertas.
- `data_pipeline/sql/`: esquema, vistas y consultas analíticas de la base de mercado.

### Dashboard

- `dashboard/app/page.tsx`: composición de la pantalla principal.
- `dashboard/components/tabs/`: vistas funcionales.
- `dashboard/hooks/`: estado, carga de datos, autenticación, portfolio, alertas y chat.
- `dashboard/app/actions.ts`: operaciones de servidor.
- `dashboard/app/api/`: integraciones HTTP y endpoints internos.
- `dashboard/proxy.ts`: refresco de sesión y protección de páginas. Las rutas API se autentican individualmente cuando manejan datos privados.

### Supabase

Las migraciones están numeradas en `supabase/migrations/` y deben aplicarse en orden ascendente. No edites una migración ya aplicada en producción: crea la siguiente migración numerada.

## 3. Configuración local

Versiones alineadas con CI:

- Node.js 22.19 o superior
- Python 3.11
- npm mediante `dashboard/package-lock.json`

Variables del dashboard (`dashboard/.env.local`), según la función usada:

```dotenv
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
FINNHUB_API_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
RESEND_API_KEY=
NEXT_PUBLIC_ADMIN_EMAIL=
```

Variables del pipeline (`.env` o entorno de ejecución), según el job:

```dotenv
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
FINNHUB_API_KEY=
RESEND_API_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
RACIONAL_FIREBASE_API_KEY=
RACIONAL_EMAIL=
RACIONAL_PASSWORD=
RACIONAL_USER_ID=
```

Usa únicamente las variables requeridas por el proceso que ejecutarás. Los valores reales se almacenan localmente, en Vercel o en GitHub Actions Secrets.

## 4. Operación del pipeline

Flujo diario de cierre (`.github/workflows/daily_etl.yml`):

1. Instalar `requirements.txt` con Python 3.11.
2. Ejecutar `python main.py --update` desde `data_pipeline/`.
3. Ejecutar `python main.py --scores`.
4. Ejecutar `python main.py --status`.
5. Ejecutar `python generate_insights.py`.

Jobs adicionales:

- `intraday_prices.yml`: precios cada 15 minutos durante mercado estadounidense.
- `sync-racional.yml`: sincronización de portfolio en días hábiles.
- `portfolio-alerts.yml`: snapshot y alertas después del ETL diario.

Las horas de los cron están expresadas en UTC. Revisa los horarios cuando cambie el horario de verano de Chile o Estados Unidos.

## 5. Desarrollo y validación

Dashboard:

```powershell
cd dashboard
npm ci
npm run dev
npx tsc --noEmit
npm test
npm run lint
npm run build
```

Pipeline:

```powershell
pip install -r requirements.txt
python -m compileall -q data_pipeline
python data_pipeline/main.py --status
```

Chequeos del repositorio:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-unwise-caches.ps1
```

GitHub ejecuta typecheck y pruebas para cambios del dashboard, además de controles contra `SELECT *` y cachés grandes. Los scripts locales deben ejecutarse antes del push; CI es la verificación final en Linux.

## 6. Cambios de base de datos

1. Crea `supabase/migrations/NNN_descripcion.sql` con el siguiente número.
2. Haz la migración segura para el estado esperado y define RLS explícitamente.
3. Aplica primero en un proyecto de desarrollo.
4. Verifica lecturas con anon key y escrituras con el rol previsto.
5. Despliega la migración antes del código que dependa de ella.
6. Conserva rollback manual o instrucciones de recuperación para cambios destructivos.

## 7. Checklist de release / push

- El diff contiene solo archivos relacionados con el cambio.
- No hay `.env`, claves, dumps ni credenciales.
- `git diff --check` no reporta whitespace.
- TypeScript, pruebas, lint y build pasan con Node 20.
- Python compila y el estado del pipeline responde con Python 3.11.
- Las migraciones nuevas se probaron y se despliegan antes que sus consumidores.
- Las rutas API privadas validan al usuario dentro del handler.
- Se hizo una prueba manual responsive para cambios visuales.
- La documentación refleja nuevas variables, jobs o pasos operativos.

## 8. Diagnóstico básico

- `401`: confirma cookies de Supabase y autenticación dentro de la ruta API.
- Base de mercado dormida o lenta: revisa `DATABASE_URL` y el timeout del pool.
- Tabla Supabase no encontrada: aplica la migración correspondiente y refresca el schema cache.
- Job nocturno fallido: abre el run de `Daily ETL` y localiza el primer paso rojo; los pasos posteriores pueden ser víctimas del mismo fallo.
- Error local `UNKNOWN ... read` en Windows/OneDrive: usa Node 20 y prueba desde una carpeta local no sincronizada antes de atribuirlo al código.
