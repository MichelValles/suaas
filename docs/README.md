# Documentación · SUAAS

Índice de la documentación. Empieza por `PROYECTO.md`.

| Archivo | Qué contiene |
|---|---|
| [`PROYECTO.md`](./PROYECTO.md) | Qué es SUAAS, stack, estructura de carpetas, auth, modelo de datos. |
| [`SISTEMA-DISENO.md`](./SISTEMA-DISENO.md) | Tokens del DS, clases semánticas, antipatrones, regla "no Tailwind". |
| [`DESARROLLO.md`](./DESARROLLO.md) | Comandos, env vars, deploy a Vercel, subdominio, troubleshooting. |
| [`ROADMAP.md`](./ROADMAP.md) | Estado actual, próximos hitos, decisiones abiertas. |
| [`SIGUIENTE-PASO.md`](./SIGUIENTE-PASO.md) | **Handoff entre sesiones**. Por dónde empezar, qué verificar, plan concreto del próximo sprint. Actualizar al cerrar cada sprint. |
| [`CAMPANAS-PLAN-MEJORA.md`](./CAMPANAS-PLAN-MEJORA.md) | Plan de mejora del módulo de campañas: diagnóstico, quick wins, releases mayores (v0.35 a v0.40), descartados y orden. Salido de investigación multiagente verificada contra el código. |
| [`CONOCIMIENTO-USUARIOS-SINTETICOS.md`](./CONOCIMIENTO-USUARIOS-SINTETICOS.md) | Base teórica del **motor**: vignettes grounded, Talker-Reasoner, métricas, riesgos. Fuente fundacional de la plataforma. |
| [`GRAVITY-MODEL.md`](./GRAVITY-MODEL.md) | Base teórica del **marco estratégico** con la tesis rectora «la decisión se toma antes del clic» como hilo conductor: Intent Momentum, los tres planos de influencia (eje pre-clic / post-clic), hipersegmentación JTBD, instancias, conductas óptima/fuga/repesca, GEO, propiedad psicológica. Incluye el catálogo de módulos por plano (con Cerebro), el mapa teoría → implementación a v0.61.x y los huecos pendientes. |
| [`AUDITORIA-SEGURIDAD.md`](./AUDITORIA-SEGURIDAD.md) | Auditorías de seguridad, estabilidad y robustez (acumulativo, la más reciente primero). |
| [`GEO-PRUEBA-IVI.md`](./GEO-PRUEBA-IVI.md) | Protocolo repetible de la prueba del GEO Tester con motores reales (marca IVI): datos de entrada exactos, resultados ligeros vs. frontera, hallazgos y costes medidos. |
| [`IVI-PUBLICO-OBJETIVO.md`](./IVI-PUBLICO-OBJETIVO.md) | Investigación multiagente del público objetivo de IVI (mercado en cifras verificadas, taxonomía de 12 segmentos) y los 15 perfiles calibrados creados a partir de ella (`source = investigacion-publico-ivi-2026-06`, sin marca en intents y backstories). |
| [`ADESLAS-DENTAL-PUBLICO-OBJETIVO.md`](./ADESLAS-DENTAL-PUBLICO-OBJETIVO.md) | Investigación multiagente del público objetivo de SegurCaixa Adeslas Dental (mercado del seguro dental en cifras verificadas, marca y producto, taxonomía de 6 segmentos) y los 3 perfiles calibrados creados a partir de ella (`source = investigacion-publico-adeslas-dental-2026-06`), en tres estadios de embudo y con la marca solo en el intent de uno. |
| [`Plan-venta.md`](./Plan-venta.md) | Plan de venta a clientes: instancias dedicadas (arquitectura A vs B), prerrequisitos, costes por instancia (infra verificada + LLM y escalado), **precio de venta y plan comercial** (tiers Starter/Pro/Agency en EUR, setup, ROI, anclaje de mercado) y plan de mantenimiento con runbook. |
| [`VERTEX-AI-VALORACION.md`](./VERTEX-AI-VALORACION.md) | Valoración verificada (jul-2026) de Google Vertex AI (Model Garden, RAG Engine, grounding, Gen AI Evaluation, Agent Engine) frente al stack actual: tres arquitecturas candidatas, riesgos y hoja de ruta. Conclusión: pgvector en Supabase como base, Vertex solo como proveedor puntual de grounding y evaluación. |

## Cómo mantener esta carpeta

Cada cambio funcional debe actualizar el archivo correspondiente en la misma sesión. La regla operativa está en `CLAUDE.md` en la raíz. Si dudas si toca actualizar, actualiza.
