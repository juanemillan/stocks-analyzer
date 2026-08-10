# Roadmap de producto — Bullia

## Objetivo

Bullia ayuda a inversionistas de Racional a descubrir, entender y monitorear
acciones estadounidenses. No ejecuta órdenes ni reemplaza el criterio del
usuario: convierte datos, noticias y portfolio en decisiones mejor informadas.

## Prioridad actual

### Fase 1 — Alertas confiables

- Alertas push para niveles de precio, stop-loss, take-profit y cambios de score.
- Alertas de oportunidades separadas de las alertas de posiciones.
- Preferencias por usuario: tipos de alerta, horario silencioso y frecuencia.
- Enlace profundo desde la notificación al activo o portfolio relevante.

Éxito: una alerta llega al propietario correcto, es accionable y no genera ruido.

### Fase 2 — Diario de decisiones

- Ticket manual de operación: tesis, entrada, stop, objetivo, monto y horizonte.
- Registro de compra/venta confirmado por el usuario; sin credenciales ni
  automatización de Racional.
- P&L realizado/no realizado, calidad de ejecución y revisión de tesis.

Éxito: el usuario puede responder qué compró, por qué, qué cambió y qué aprendió.

### Fase 3 — Inteligencia de noticias

- Clasificador: activos afectados, tema y urgencia.
- Análisis de sentimiento con fuente, fecha y nivel de confianza.
- Detector de catalizadores: resultados, guidance, M&A, regulación y cambios de analistas.
- Resumen breve que explique la señal sin dar una orden de compra o venta.

Éxito: cada alerta importante muestra evidencia y contexto, no solo una etiqueta de IA.

### Base incorporada — Calidad & Valor

- Pantalla de investigación inspirada en inversión de calidad a largo plazo.
- ROE, flujo de caja libre, deuda, márgenes y múltiplos visibles por empresa.
- El puntaje muestra criterios cumplidos; no representa una recomendación ni valor intrínseco.

### Fase 4 — Riesgo de portfolio

- Concentración por activo y sector, correlación y drawdown.
- Alertas cuando una nueva operación aumenta concentración o riesgo.
- Escenarios simples: impacto de una caída del 5%, 10% o 20% en una posición.

Éxito: el usuario ve el riesgo agregado antes de añadir una posición.

### Fase 5 — Integración editorial premium

- Evaluar Finimize u otra fuente licenciada después de medir uso de noticias.
- Mantener las fuentes detrás de una capa de ingesta del servidor.
- Mostrar atribución, enlace a la fuente y solo el contenido permitido por licencia.

Éxito: más contexto y retención sin depender de scraping ni exponer claves.

## Reglas de producto

- Las notificaciones son opt-in, deduplicadas y configurables.
- Las recomendaciones siempre son orientativas; no hay ejecución automática.
- Las claves de proveedores viven solo en servidor o GitHub Actions Secrets.
- La información privada de un usuario nunca se envía a otro usuario.
- Una función nueva requiere datos verificables, estado vacío útil y una forma clara de desactivarla.

## Próximo hito

Habilitar alertas push de producción y añadir preferencias de alerta por usuario.
Antes de desplegar, configurar en GitHub Actions `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT` y un `FROM_EMAIL` verificado en Resend.
