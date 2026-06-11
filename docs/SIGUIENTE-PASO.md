# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-06-11 tras v0.47.1 (fix de los runs de campaña con creatividades).

## Estado actual (v0.47.1 desplegada)

- **Fix crítico de los runs de campaña (v0.47.1)**: los runs de las campañas IVI (y cualquier campaña con creatividades) cerraban en `error` con 0 respuestas. Causa: Opus 4.7 + `generateObject` + imágenes devuelve el JSON envuelto en XML que el AI SDK no parsea (mismatch ya documentado en `five-second.ts`). El probe elige modelo según contenido (imágenes → `DEFAULT_MODEL`), `judgeLandingMatch` pasa a `DEFAULT_MODEL`, el runner persiste `runs.params.last_error`, la página del run lo muestra y «Retomar» también aparece con 0 respuestas. **Pendiente de validar**: relanzar los 6 runs IVI desde la página de cada run (botón «Retomar», requiere sesión) o desde la tarjeta de `/seed-examples`.
- **Seed «Campañas IVI: las 6 estrategias» (v0.47.0)**: tarjeta en `/seed-examples` que crea 6 campañas reales sobre ivi.es (una por estrategia) y lanza los 6 runs con perfiles de 28 a 45 años en `after()`.

## Estado anterior (v0.46.0)

- **Migraciones 0019 y 0020 APLICADAS** por el operador (2026-06-11). Migraciones aplicadas: 0001 a 0020. El tracking vive en la tabla `suaas_migrations` y se ve en `/diag → Tracking de migraciones`; convención: cada migración nueva inserta su propia fila al final. Los fallbacks legacy de `lib/campaigns.ts` (channels pre-0011, strategy pre-0013, intended_message, product, deleted_at) se podaron en v0.46.0; los del runner que leen `meta` se conservan para las filas históricas.
- **Formulario de campaña reorganizado (v0.46.0)**: comunes primero (nombre, brief, mensaje pretendido, URL final, landing), luego canal + estrategia, luego los específicos. Previews por estrategia: SERP con empresa y logo (Search), banner (Display/PMax), tarjeta de feed (Demand Gen), pre-roll con miniatura (Video) y ficha de producto (Shopping). Fix global de los `<option>` de los selects (fondo del tema).
- **Requisitos por estrategia según las specs oficiales de Google (v0.41 a v0.45.4)**: implementadas y verificadas fila a fila contra las fuentes (re-extracción con doble verificación en v0.45.1-4): Search (17092074: RSA 1-15/1-4 + empresa y logo obligatorios del bloque Business information), Performance Max (17091269), Demand Gen (17091672: titulares de 40c, CTA obligatoria), Video (17091270: titular largo opcional, CTA ≤ 10c opcional) y Shopping (feed 7052112: producto con id/title/description/price/availability + brand/gtin/mpn/condition). Solo App Campaigns sigue como «Próx.». Detalle por versión en `docs/ROADMAP.md → v0.41.x+`.

## Estado anterior (v0.40.0)

- **Plan de mejora de campañas completado (v0.35.0 → v0.40.0)**: las 16 mejoras de `docs/CAMPANAS-PLAN-MEJORA.md` publicadas de una en una, cada una con su ciclo completo cambio → bump → deploy → commit. Detalle por versión en `docs/ROADMAP.md` (releases 1 a 6). Resumen: fidelidad (brief fuera del persona, razonamiento antes del score con anclas, métricas honestas «Intent ≥ 0,5»), loop de iteración (duplicar, repetir muestra, export CSV/Ads Editor, comparativa run vs run), consolidación de BD (0019 + tracking `suaas_migrations`), robustez (runner tolerante a fallos con `after()`, progreso, reanudación; presupuesto `SUAAS_DAILY_TOKEN_BUDGET` + estimación previa), profundidad (juez neutral de comprensión, `behavior_class`, tabla interactiva, token `--serp-link`, síntesis «Qué cambiar») y muestreo RSA con ranking por asset.
- **Cambio de semántica en v0.40.0**: las respuestas de Search evalúan UNA combinación muestreada (3 titulares + 2 descripciones), no el inventario completo. Los runs anteriores a v0.40 no son comparables con los posteriores.
- **Validación recomendada**: relanzar un run sobre una campaña seed con los mismos perfiles y comparar `mean_intent_to_click`/`mean_clarity` con el histórico (se espera que bajen algo: el sesgo del brief y el clustering de scores existían). Pendiente operativo: comparar dos runs idénticos con el probe en Opus vs Sonnet usando `gateway_usage` antes de decidir cambio de modelo.
- **Env var nueva opcional**: `SUAAS_DAILY_TOKEN_BUDGET` (tokens por ventana de 24h; sin configurar no hay límite). Configurarla en Vercel si se quiere el gate de coste (429 en los 8 endpoints de runs).
- **Fleco aplazado**: reutilizar el `DisplayAdPreview` del formulario en el detalle de campañas Display (hoy enseña preview SERP también para banners).

## Estado anterior (v0.34.0)

- **Papelera coherente en históricos (v0.34)**: las vistas de resultados cargan entidades en papelera vía `getXWithTrashed` en `lib/{targets,ab,campaigns,copy,funnels,pricing}.ts` (un borrado ya no rompe runs antiguos). `/ab/[id]`, `/geo/[id]` y `/momentum/[id]` muestran aviso «En papelera» y bloquean el lanzamiento de runs nuevos (rechazo server-side incluido). Los enlaces de cabecera de las vistas históricas apuntan al listado si la entidad está en papelera (antes llevaban a un 404).
- **`MigrationPendingError` (v0.34)**: clase nueva en `lib/supabase.ts`; softDelete/restore de geo, momentum y perfiles devuelven 409 con mensaje seguro si falta la migración `0017`.
- **Diag ampliado (v0.34)**: auditoría de columnas críticas por migración (`CRITICAL_COLUMNS`) sobre varias tablas, `geo_analyses` y `momentum_challenges` incluidas, y `pending_migrations` en el JSON de `/api/diag` (incluye la migración creadora si falta la tabla entera).
- **Próximo sprint recomendado**: el **plan de mejora del módulo de campañas** (`docs/CAMPANAS-PLAN-MEJORA.md`), resumido más abajo en «Próximo paso candidato».

## Estado anterior (v0.33.0)

- **Capa de temas (v0.33)**: oscuro por defecto con switch de modo claro al pie del sidebar (`components/theme-switch.tsx`, localStorage `suaas-theme`, script anti-FOUC en `app/layout.tsx`). Canal `--fg` + `--surface-app/panel`, `--text-strong`, `--accent-text` y semánticos `--{success,warning,error}-text` en `globals.css`. Codemod migró 791 `rgba(255,255,255,x)` en 64 archivos. Login y `/onboard` van con `.theme-dark-fixed` (siempre oscuros).
- **Limpieza anti-AI-slop (v0.33)**: erradicado el arcoíris Tailwind (azul/naranja/violeta de los planos en home y `/gravity`, semáforo verde/amarillo/rojo en GEO/Momentum/chat/5s) y los glows neón. Planos ahora con numeración editorial `01·02·03` en accent y diagrama orbital monocromo con centro accent. Reglas nuevas documentadas en `docs/SISTEMA-DISENO.md → Tema` y `Antipatrones`.
- **Pendiente anotado**: contraseña de «Conceptos pendientes» (`/gravity`) hardcodeada en cliente; moverla a env en el sprint de seguridad.

## Estado anterior (v0.32.0)

- **Consistencia de funcionalidades menores (v0.32)**: papelera extendida a GEO, Momentum y Perfiles (9 tipos; migración `0017`), seed para los 8 módulos y **seed con brief** (genera el contenido de los ejemplos con IA a medida, `lib/seed-brief.ts`, scope `seed_brief`). Fix del check SQL de descriptions en campañas (`0018`). Endpoints de GEO/Momentum higienizados con `lib/error-response.ts`. Ver `docs/ROADMAP.md → v0.32.0` para los pendientes detectados por la auditoría (edición/duplicado, acoplamiento target↔A/B en papelera, runners síncronos).
- **Gravity Model (v0.29)** y **Momentum (v0.30)** en producción. Ver `docs/PROYECTO.md → Módulos Gravity Model` para el detalle: `intent_context` (JTBD en perfiles), Intent Momentum en el chat, `behavior_class` en el test 5s, GEO Tester (`/geo`) y Momentum (`/momentum`).
- **Migraciones aplicadas**: 0001 a 0018 (`0017_trash_geo_momentum_profiles.sql` y `0018_campaigns_descriptions_fix.sql` incluidas).
- **Scopes de telemetría nuevos**: `geo_probe`, `momentum_probe`, `onboard_synthesize`, `seed_brief`.
- **Auditoría 2026-06-10 (`docs/AUDITORIA-SEGURIDAD.md`)**: 18 hallazgos consolidados, ninguno crítico. Pendientes de corrección (no aplicados todavía). Prioridad: A-01 (cookie de sesión eludible), A-02 (fuga de error en `/api/onboard/submit` público), B-01/B-02/B-03 (runners de GEO/Momentum: deadlock en `running`, sin cap de coste, guard no atómico). **Es el candidato natural al próximo sprint, antes de añadir más funcionalidad.**

## Estado anterior (v0.28.0 desplegada)

- Ruta pública nueva `/onboard` para convertir humanos reales en gemelos sintéticos. Comparte el cuestionario desde la toolbar de `/profiles` (botón «Compartir cuestionario» con URL + QR).
- Cuestionario: 5 demográficas + 24 HEXACO-24 Likert + 2 abiertas = 31 preguntas, ~10 min en móvil. Wizard step-by-step con `motion` y avance automático en HEXACO.
- Big Five se calcula determinísticamente desde HEXACO. El LLM (Opus, scope `onboard_synthesize`) sólo extrae ocupación + COM-B + backstory, integrando frases TEXTUALES del usuario.
- Resultado en `/onboard/result/[id]` con tarjeta visual + botón «Descargar mi gemelo» que pega contra `/api/onboard/og` (PNG 1200x630, `next/og`).
- Anti-abuso: rate limit en memoria 5/h por IP, tope global 50/día, honeypot. Sin email, sin registro. Perfiles generados llevan `source='self_report'`.
- Sin migración. Dep nueva: `qrcode`.

## Estado anterior (v0.26.3)

- **Producción**: https://suaas.flat101.business
- **Login global**: cookie `auth_suaas`, env `ACCESS_PASSWORD`.
- **Segundo gate** para sembrar: cookie `seed_access`, env `SEED_PASSWORD` (obligatoria en producción desde v0.20.0).
- **Supabase**: proyecto `supabase-erin-mirror` (org propia, no la del Marketplace de Vercel).
- **Migraciones aplicadas**: 0001 a 0014 (la última, Display Ads `0014_campaigns_display.sql`).
- **Vercel AI Gateway**: configurado, créditos cargados, scopes instrumentados (`probe_5s`, `judge_5s`, `probe_funnel`, `reasoner_chat`, `talker_chat`, `copy_resonance`, `pricing_react`, `campaign_probe`, `campaign_landing`, `campaign_ideal`, `onboard_synthesize`). Nota: `seed_profile` listado en versiones anteriores no es un scope real; `lib/seed-profiles.ts` usa `reasoner_chat` con `meta: { kind: "seed_profile" }`.
- **Vercel Blob**: store `suaas-uploads · store_1yLEHreMdAwe3V6D` en `iad1`. Uploads de imagen, vídeo y audio.

## Módulos productivos

| Módulo | Ruta | Estado |
|---|---|---|
| Claridad 5s | `/targets` | Estable desde v0.4.0 |
| Embudos | `/funnels` | Estable desde v0.5.2 |
| A/B tests | `/ab` | Estable desde v0.7.0 |
| Copy resonance | `/copy` | Estable desde v0.7.0 |
| Pricing | `/pricing` | Estable desde v0.7.0 |
| Campañas · Google Ads | `/campaigns` | **Search RSA** (v0.21.0) + **Display RDA** (v0.26.0). Otras 5 estrategias (Performance Max, Demand Gen, Video / YouTube, App Campaigns, Shopping) están como sub-pestañas `Próx.` desde v0.25.0. |
| Perfiles | `/profiles` | Explorer con grid/tabla, filtros, CSV import/export, generación LLM (50 seeds). |

Sistemas auxiliares: `/diag`, `/tokens`, `/trash` (soft delete con `deleted_at`, 9 tipos desde v0.32: incluye geo, momentum y perfiles), `/seed-examples` (siembra los 8 módulos en una pasada con gate; acepta un brief opcional para generar el contenido con IA a medida).

## Últimos sprints relevantes

- **v0.26.x · Display Ads (RDA)**: segunda estrategia dentro de Google Ads. Modelo extendido con `company_name`, `long_headline`, `cta`. Cada `Creative` gana `role` (`landscape_image | square_image | portrait_image | logo_square | logo_landscape | video_youtube | generic`). Schema `superRefine` por strategy. Form con branch UI por estrategia. Runner con framing «banner patrocinado». Preview en vivo adaptado (card landscape + logo + long_headline + CTA accent). Espaciado consistente tras `PageHeading` vía `display: flex; gap: clamp(32px, 4vw, 56px)` en `.app-shell-main`. Subtítulos eliminados de páginas índice y `/new`.
- **v0.25.x · Estrategias dentro del canal**: las 7 estrategias publicitarias aparecen como sub-pestañas con iconos lucide y badge `Próx.` para las no implementadas.
- **v0.24.x · Multi-canal por campaña**: a nivel BD (`channels text[]`). En UI sólo Google está habilitado, las otras 4 redes (Meta, LinkedIn, TikTok, X) están deshabilitadas con `Próx.`.

## Decisiones recientes a no romper

- **Strategy de Campaña** vive en `campaigns.strategy text not null` con check sobre 7 valores (`search | display | performance_max | demand_gen | video | app | shopping`). Helper `isStrategyImplemented(s)` central.
- **Role de Creativity** es opcional en Search, obligatorio cumplir `1+ landscape & 1+ square & 1+ logo_square` en Display.
- **Imagen multimodal**: para YouTube usamos `thumbnail_url` o el thumbnail jpg derivado de `youtube_id`. Los modelos actuales no procesan vídeo.
- **Espaciado global**: el gap entre el `PageHeading` y el primer `<section>` lo da `.app-shell-main` (flex column con gap). No añadir márgenes manuales al body de cada página.
- **Subtítulos**: el `description=` de `PageHeading` se reserva para páginas de detalle (donde el contenido es el brief de la entidad). Índices y `/new` no llevan subtítulo.
- **Sin em-dash en copy**. Castellano con acentos. Sin Tailwind. Sin `data:` URLs en BD si Blob está disponible.

## Próximo paso candidato

**Recomendado: plan de mejora del módulo de campañas.** Detalle completo (diagnóstico, quick wins, releases mayores, descartados y orden) en [`CAMPANAS-PLAN-MEJORA.md`](./CAMPANAS-PLAN-MEJORA.md). Sale de una investigación multiagente del módulo (2026-06-11), verificada contra el código. Resumen del diagnóstico: cuatro frentes de deuda (fidelidad metodológica con el brief filtrado al persona, robustez del runner que cae entero ante un fallo y deja runs zombi, deuda de esquema con 8 migraciones y RLS apagado, y loop de producto roto sin duplicar/comparar/exportar). Plan en cinco releases:

| Release | Contenido | SQL |
|---|---|---|
| **v0.35 · Fidelidad y honestidad** | Retirar brief del prompt, razonamiento antes del score, bugs latentes del runner, métricas honestas («Intent ≥ 0,5» en vez de «CTR»), frontera de BD tipada | No |
| **v0.36 · Loop de iteración** | Duplicar campaña, repetir run con la misma muestra, export CSV/Ads Editor, comparativa run vs run | No |
| **v0.37 · Consolidación de BD** | Migración `0019` (`suaas_migrations`, RLS, checks reales, drop `channel` legacy) + poda de fallbacks | Sí |
| **v0.38 · Robustez operativa** | Runner tolerante a fallos con progreso y reanudación, presupuesto de tokens con estimación previa | No |
| **v0.39 · Profundidad** | Juez neutral de comprensión, `behavior_class` del Gravity Model, tabla interactiva, síntesis «Qué cambiar» | Sí |
| **v0.40 · Ranking por asset** | Muestreo de combinaciones RSA y rendimiento por titular | Sí |

Empezar por v0.35: es lo más barato, no toca SQL y corrige el sesgo de fidelidad cuanto antes (menos histórico contaminado). En la sesión de SQL de v0.37, agrupar también las columnas de v0.39 y v0.40.

## Otros candidatos (aplazados)

### A) Implementar la 3ª estrategia de Google Ads

Las dos con más músculo son **Performance Max** y **Shopping** porque introducen tipos de input nuevos:

- **Performance Max**: feed de assets multi-formato + audience signals + objetivos de conversión. Permite probar la lógica de un mismo conjunto de assets recombinados por el motor.
- **Shopping**: feed de productos (title, price, image, GTIN, brand). Encaja con el módulo de Pricing existente.

**Demand Gen** y **Video / YouTube** son más visuales y dependen de un buen reproductor de vídeo en el preview.

### B) Activar multi-canal real (Meta / LinkedIn / TikTok / X)

El esquema `channels text[]` ya está, pero el plan de campañas lo deja explícitamente aplazado (fidelidad falsa sin caps por red). Falta:

1. Caps de caracteres reales por red en `lib/campaigns.ts` (hoy todas usan 30/90 de Search RSA).
2. Framing por red en el runner (Meta-feed, LinkedIn-newsfeed, etc.).
3. Roles de creatividad específicos (Stories 9:16, Reels, carousels...).
4. Habilitar las 4 pestañas en `/campaigns/new` retirando los badges `Próx.`.

### C) Generación de perfiles desde datasets reales

LifeSnaps, Project Baseline u otros datasets de comportamiento real. Mejoraría la calibración VoC frente a la generación 100% LLM actual.

## Backlog vivo

- ¿Auth por email (Supabase Auth) además del password global? Cuando se invite a clientes externos.
- ¿Caché de respuestas LLM en Vercel Runtime Cache para abaratar iteración?
- ¿Vercel Queues para encolar runs largos (>300s) en background?
- Migrar uploads grandes a **client upload directo a Vercel Blob** (`handleUpload`) para evitar `bodySizeLimit` en server actions con imágenes >10MB.
- ¿Métrica de coste por run (tokens × precio) en `/tokens` con desglose por entidad?

## Comandos de emergencia

```bash
# Logs en vivo
vercel logs https://suaas.flat101.business --follow

# Promover deployment anterior si hay regresión
vercel promote <deployment-url>

# Rollback al último prod estable
vercel rollback

# Env vars
vercel env ls
vercel env pull

# Si Supabase devuelve PGRST205 tras migrar, recargar schema cache:
#   NOTIFY pgrst, 'reload schema';
# desde el SQL editor del dashboard.
```

## Cómo retomar en frío

1. Leer este archivo.
2. Mirar `docs/ROADMAP.md` para confirmar que la última fila coincide con `lib/version.ts`.
3. Comprobar `git status` y `git log --oneline -5`.
4. Si vamos a crear entidades nuevas en un módulo, verificar en `/diag` que las tablas y columnas existen.
5. Tras cada cambio funcional: ciclo completo cambio → docs → bump → `vercel --prod --yes` → commit → push (regla `CLAUDE.md`).
