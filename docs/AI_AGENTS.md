# Agentes de IA de Bullia

Bullia separa los **cálculos verificables** de la **interpretación asistida**. Correlación, exposición, precios, scores y reglas se calculan en el dashboard o pipeline; los modelos solo resumen, priorizan vacíos de información y proponen qué investigar. Ningún agente ejecuta operaciones, accede a Racional ni entrega instrucciones definitivas de compra o venta.

## Agentes disponibles

| Agente | Qué recibe | Qué entrega | Modelo | Activación |
|---|---|---|---|---|
| Análisis de acción | Score, valoración, plan y hasta tres noticias visibles | Tesis, riesgos y verificaciones siguientes | Terra | Botón en el detalle de una acción |
| Diagnóstico de portafolio | Exposición, sectores, buckets de score y correlaciones calculadas | Panorama, concentraciones, relaciones y temas a investigar | Terra | Botón en Mi Portfolio |

Las rutas privadas son `POST /api/analysis/asset` y `POST /api/analysis/portfolio`. Ambas exigen sesión de Supabase, limitan solicitudes por usuario, usan timeout de 30 segundos, envían un `safety_identifier` seudonimizado y configuran `store: false`.

## Próximos agentes

| Agente | Frecuencia propuesta | Datos requeridos | Modelo inicial |
|---|---|---|---|
| Noticias y sentimiento | Varias veces al día | Fuente de noticias con licencia, símbolos y timestamps | Luna |
| Oportunidades/comparables | Diario o semanal | Universo, sector/industria, score, valoración y liquidez | Luna para filtrar; Terra para explicar |
| Consenso de analistas | Semanal | Proveedor de estimaciones, ratings y precio objetivo | Luna para resumir; Terra para discrepancias |
| Riesgo e historial | Diario/semanal | Series de precios, drawdown, beta y correlación | Cálculos sin IA; Terra para síntesis |
| Investigación profunda | Bajo demanda | Datos verificados, documentos y citas | Sol |

No se implementan como “multi-agente” autónomo todavía: cada flujo debe tener una fuente de datos, una salida verificable, costo y evaluación definidos antes de automatizarlo.

## Uso de modelos

- **Luna**: clasificación y resúmenes de alto volumen/costo sensible.
- **Terra**: interacción con el usuario, análisis de una acción y síntesis de portafolio.
- **Sol**: investigación compleja puntual donde una mejora de calidad justifique mayor latencia y costo.

La referencia oficial recomienda Terra para equilibrio de inteligencia/costo, Luna para cargas de alto volumen y Sol para capacidad máxima. Usa Responses API y selecciona `reasoning.effort` según la tarea. <https://developers.openai.com/api/docs/guides/latest-model>

## Operación y privacidad

- Configura `OPENAI_API_KEY` solo en `dashboard/.env.local` y en Vercel; nunca en `NEXT_PUBLIC_*` ni en Git.
- El análisis se solicita explícitamente por el usuario; no se ejecuta al cargar la app.
- Antes de automatizar tareas diarias, guarda resultados con fecha, fuente de datos, símbolos analizados y versión del prompt para poder auditarlos.
- Evalúa respuestas con casos reales antes de subir razonamiento, tokens o frecuencia.
