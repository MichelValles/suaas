# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-06-14 tras v0.60.0 (Cerebro: selector en los 6 formularios de marca + documentos privados ZDR).

## Estado actual (v0.60.0 desplegada)

- **Cerebro · base de conocimiento de marca (v0.59.0)**: módulo nuevo en Knowledge Tools (`/cerebro`) para crear Marcas y adjuntarles documentos `.md` (incluida info privada que no está en buscadores: analytics, informes, VoC). En los formularios que piden info de marca aparece un selector (`components/brand-picker.tsx` + `GET /api/brands`) que rellena los campos desde una marca guardada (descripción + documentos concatenados vía `buildBrandContext`); también se puede seguir escribiendo a mano. Tablas `brands` + `brand_documents` (migración 0025, aplicada vía MCP); papelera con tipo `brand`; CRUD en `lib/cerebro.ts`. **El selector está en los 6 formularios que piden marca** (v0.60): GEO (brand_name + brand_description), Momentum (brand_context), Campañas (company_name + brief), Copy (context), Pricing (description) y Claridad 5s (main_promise, rellenado con la descripción corta). **Documentos privados (ZDR, v0.60)**: cada documento `.md` puede marcarse como «Privado · no enviar a los modelos»; se guarda en Cerebro pero queda excluido de `buildBrandContext`, así no entra en ningún prompt ni viaja al gateway (migración 0026, columna `brand_documents.sensitive`). Es la única cero retención que la app garantiza por sí misma: no enviar. La retención cero a nivel de proveedor (cuando el dato SÍ se envía) sigue siendo un ajuste de cuenta del AI Gateway/proveedores, a confirmar por separado en Vercel. **Decisión metodológica clave** (de la auditoría previa, ver el hilo): Cerebro solo RELLENA campos de entrada; respeta que la marca NO entre en el prompt del perfil evaluador de los tests «a ciegas» (5s, embudos) ni en la sonda desnuda del GEO, para no contaminar la medición.
- **Modo beta (v0.58.0)**: toggle en `/diag` (sustituye a la antigua tarjeta «Esquema · todo verde») que revela los módulos aún sin desarrollar: Embudos (`/funnels`), A/B tests (`/ab`), Pricing (`/pricing`) y Sembrar (`/seed-examples`). Apagado de serie: esos cuatro quedan ocultos en el sidebar y en las tarjetas de la home salvo que el operador lo active. Persistencia por navegador en `localStorage` (`suaas-beta`) y sincronización en vivo vía evento de ventana. Piezas: `components/use-beta-mode.ts` (hook + helpers), `beta-mode-toggle.tsx` (la tarjeta) y `beta-only.tsx` (wrapper para la home, que pasa la tarjeta ya renderizada como children para no cruzar el icono no serializable). El detalle del esquema sigue íntegro en las secciones inferiores de `/diag`. Para sumar un módulo nuevo al modo beta: marcar su ítem con `beta: true` en `components/sidebar.tsx` y, si está en la home, en `app/page.tsx`.
- **Modo claro cálido y contraste AA (v0.57.3)**: el lienzo del tema claro pasó de blanco puro a marfil cálido `#f1ede4` (paneles `#faf7f0`); el texto secundario y tenue se enrutó por `--text-secondary`/`--text-faint` para pasar AA en claro sin tocar el oscuro, y el texto accent baja a `--accent-800` en claro. Detalle en `docs/SISTEMA-DISENO.md → Tema`.

### Paquete de público objetivo de SegurCaixa Adeslas Dental (v0.57.2)

Sprint 2026-06-13 (tarde): paquete de público objetivo de **SegurCaixa Adeslas Dental** (seguro dental), análogo al de IVI pero para otra marca y otro vertical.

- **Investigación verificada del público de Adeslas Dental** (`docs/ADESLAS-DENTAL-PUBLICO-OBJETIVO.md`): workflow multiagente (8 ángulos de búsqueda web + 16 verificadores adversariales + síntesis). Cubre la marca y su cartera dental vigente 2026 (Adeslas Dental Max sin carencia desde 10 €/mes; Adeslas Dental Total trienal 379/339/319 €), el mercado del seguro dental en cifras verificadas (penetración ~28-30%, costes de tratamientos que disparan la compra, posicionamiento de precio gama media), una taxonomía de 6 segmentos y el canal diferencial CaixaBank. La verificación tumbó varios datos mal atribuidos (cuotas dentales de 2017, rango de implante del Consejo de Dentistas, odontofobia de 2022): documentados como «no usar como dato actual».
- **3 perfiles calibrados de Adeslas Dental creados** (`/profiles`, `source = investigacion-publico-adeslas-dental-2026-06`), en tres estadios de embudo: Nuria Castellano (28, Valencia, **valorando** la categoría), Joaquín Bermúdez (43, Zaragoza, **conoce la marca**, familia con ortodoncia) y Amparo Quintela (63, Vigo, **cerca de la conversión**, implantes). **La marca «SegurCaixa Adeslas Dental» aparece una sola vez en todo el set, en el `intent_context` de Joaquín**; los otros dos son 100% libres de marca (verificado con query). Sin retrato todavía (opcional, generable desde el detalle).
- **Insertados vía MCP de Supabase** (`execute_sql`), sin migración (reutilizan el esquema de `profiles`). El set IVI (15 perfiles) sigue intacto.

## Estado anterior (v0.57.0)

Sprint 2026-06-12/13: el GEO Tester pasa de simular a consultar motores reales, y se construye el paquete completo de IVI (investigación de público, 15 perfiles calibrados y retratos).

- **GEO Tester con motores reales (v0.56.0)**: la query de cada segmento se lanza tal cual contra **Claude** (web search server-side de Anthropic), **ChatGPT** (web_search de OpenAI) y **Perplexity** (Sonar) vía AI Gateway, con citas reales y análisis honesto por motor (scope nuevo `geo_analysis`); pestañas funcionales en `/geo/[id]` con citas clicables y visibilidad por motor. **Modelos por motor elegibles en `/tokens`** (tabla `app_settings`, migración 0023): ligeros para pruebas (~0,10 $/análisis de 3 segmentos), frontera para análisis serios (~2 $). Los resultados v1 (simulados) se renderizan como legado. v0.56.1: saneado de U+0000 antes de persistir en jsonb (las sondas frontera arrastran ese carácter del contenido web). Protocolo repetible con IVI y comparativa ligeros vs frontera en `docs/GEO-PRUEBA-IVI.md` (la varianza entre runs es real: mirar tendencia, no foto única).
- **Investigación del público objetivo de IVI** (`docs/IVI-PUBLICO-OBJETIVO.md`): workflow multiagente (8 ángulos de búsqueda web + 14 verificadores adversariales + síntesis), mercado en cifras verificadas y taxonomía de 12 segmentos con journey, miedos y canales.
- **15 perfiles calibrados de IVI creados** (`/profiles`, `source = investigacion-publico-ivi-2026-06`): cubren los 12 segmentos (FIV primaria x3, ovodonación x2 con una internacional, madre soltera, ROPA, preservación social y oncológica, factor masculino, secundaria, aborto de repetición, DGP, derivada de la pública, embriodonación). **Sin marca** en intent, backstory y barreras (verificado con query) para no sesgar tests; canales integrados como frase final del backstory.
- **Retratos fotorrealistas (v0.57.0)**: `profiles.avatar_url` (migración 0024), `lib/avatar.ts` con `generateImage` vía gateway (`google/imagen-4.0-generate-001`, ~0,04 $/retrato, env opcional `SUAAS_AVATAR_MODEL`) y subida a Blob. El prompt NO incluye el nombre y la UI etiqueta «retrato generado por IA». `POST /api/profiles/[id]/avatar` (402 accionable sin créditos), botón generar/regenerar en el detalle, miniaturas en explorer. Los 15 perfiles IVI tienen retrato.
- **⚠️ Saldo del AI Gateway BAJO: ~4 $** (el sprint consumió ~6 $ entre GEO frontera, investigación y retratos). Antes de runs grandes: recargar créditos o activar auto top-up (Vercel → AI Gateway → Billing). El umbral ámbar de `/tokens` ya avisa por debajo de 5 $.
- **Migraciones aplicadas: 0001 a 0024** (0023 y 0024 vía MCP de Supabase del proyecto, operativo y estable: `apply_migration`/`execute_sql` sin re-OAuth).

## Estado anterior (v0.55.0)

- **Canal TikTok Ads completo (v0.55.0)**: 3 formatos como estrategias (`tiktok_video`, `tiktok_carousel`, `tiktok_spark`), objetivo + 1..5 textos de anuncio + @usuario + música en `campaigns.channel_spec` con discriminador `network: "tiktok"` (`ChannelSpec` ahora es union `MetaSpec | TikTokSpec`; usar `metaSpecOf`/`tiktokSpecOf`), caps oficiales verificados (ad text 100c sin emojis ni «#», display name 40/20, carousel 2-35 imágenes con música obligatoria, vídeo 9:16 5-60s), CTAs de TikTok localizadas, preview en vivo del feed «Para ti» (columna de iconos, caption con «más», disco con `.spin-slow`), export `?format=tiktok` y seed IVI ampliado a 7 estrategias. Detalle en `ROADMAP.md → v0.55.0` y `PROYECTO.md → Módulo Campañas`.
- **Migraciones 0021 y 0022 APLICADAS** (2026-06-12, SQL editor) y **campaña de ejemplo «IVI · TikTok · Vídeo in-feed» creada** (id `e387fea0`, vía MCP de Supabase, SIN runs). El MCP del proyecto quedó operativo tras eliminar el servidor global caducado que lo eclipsaba (`claude mcp remove supabase -s user`) y completar el OAuth; si las herramientas no aparecen tras autenticar, reconectar en `/mcp`.
- **Validación recomendada**: lanzar un run de la campaña IVI de TikTok con 2-3 perfiles y comprobar que (1) el snippet describe el feed «Para ti» con caption y música, (2) `shown_descriptions` registra la variante de texto mostrada y (3) «Rendimiento por asset» lista los textos del anuncio.

## Estado anterior (v0.54.0)

- **Canal Meta Ads completo (v0.54.0)**: 3 formatos como estrategias (`meta_single`, `meta_carousel`, `meta_collection`), objetivo ODAX + placement de simulación + 1..5 textos principales en `campaigns.channel_spec` (jsonb), caps oficiales (máximo técnico vs recomendado visible con truncado ecológico en el runner), CTAs de Meta en castellano, tarjetas/portada como roles de creatividad nuevos (`card`/`cover`), previews en vivo (feed, 9:16 con safe zones, carousel, colección), export `?format=meta` y ranking por asset con `primary_text`. Detalle en `ROADMAP.md → v0.54.0` y `PROYECTO.md → Módulo Campañas`.
- ~~ACCIÓN PENDIENTE: aplicar `0021_meta_ads.sql`~~ → ahora la cubre `scripts/apply-tiktok-setup.mjs` (punto de arriba).
- **Validación recomendada tras la migración**: crear una campaña `meta_single` con placement Stories, lanzar un run con 2-3 perfiles y comprobar que (1) el snippet del perfil describe el contexto de Stories sin headline, (2) `shown_descriptions` registra el texto principal mostrado y (3) la sección «Rendimiento por asset» lista los textos principales.

## Estado anterior (v0.49.0 a v0.53.0)

- **Incidente de la cuota del AI Gateway (2026-06-11)**: la API key del gateway agotó su budget de 3$ (acumulado de por vida, refresh period `none`) y todos los runs fallaban con «Quota limit exceeded». Causa raíz: el seed IVI de v0.47.0 lanzó 6 runs en paralelo cuyo probe (Opus 4.7 + generateObject + imágenes sin redimensionar) fallaba siempre el parse, facturado x2 por el reintento y sin rastro en `gateway_usage`. **ACCIÓN PENDIENTE DEL OPERADOR**: subir el budget de la key en Vercel (scope equipo → AI Gateway → API Keys → ··· → Edit key) y cambiar el refresh period de `none` a monthly/daily; sin eso la key sigue bloqueada.
- **Blindaje de costes en 3 releases**:
  - **v0.47.2**: runner de campañas íntegro en Sonnet (Opus fuera del probe también en texto puro) y telemetría de llamadas fallidas (`usageFromError` + `meta.failed=true` en probe, landing, juez, ideal y síntesis).
  - **v0.48.0**: `budgetGate` extendido a `/api/chat`, `/api/seed/examples` (si consume LLM), `/api/profiles/seed`, `/api/profiles/batch-intent` y `/api/onboard/submit` (429 genérico, ruta pública); `batch_intent` registra por fin su consumo (scope nuevo). C-02 mitigado y C-03 cerrado en la auditoría.
  - **v0.49.0**: `resolveImageForApi` redimensiona jpeg/png/webp a 1024px de lado largo con `sharp` (dependencia nueva) antes del base64; GIF pasa intacto.
  - **v0.49.1**: fixes de la revisión adversarial del blindaje: paginado de `gateway_usage` (el cap de 1.000 filas de PostgREST dejaba ciego al presupuesto bajo carga), `.rotate()` EXIF en el redimensionado, filas failed excluidas de las medias de estimación y re-check de presupuesto cada 25 combinaciones en el runner (métrica `n_skipped_budget`). Pendientes anotados en `ROADMAP.md → v0.49.1`.
  - **v0.50.0**: coste estimado en dólares en cada botón que consume el gateway (`lib/model-pricing.ts` + `lib/estimate.ts` + `GET /api/estimate/run`, que sustituye a `/api/estimate/campaign`): panel de lanzamiento de los 6 módulos, GEO, Momentum, chat (por mensaje), seed de perfiles y `/seed-examples`. Cifras orientativas sobre medias históricas por scope.

## Estado anterior (v0.47.1)

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
| Campañas · Google Ads | `/campaigns` | 6 de 7 estrategias implementadas según specs oficiales (v0.41-v0.45): Search RSA, Display, PMax, Demand Gen, Video, Shopping. Solo App Campaigns como `Próx.`. |
| Campañas · Meta Ads | `/campaigns` | **3 formatos** (single, carousel, collection) con objetivo ODAX, placement de simulación y textos principales (v0.54.0). Requiere migración 0021. |
| Campañas · TikTok Ads | `/campaigns` | **3 formatos** (vídeo in-feed, carousel, spark) con objetivo, textos rotatorios, @usuario y música (v0.55.0). Requiere migración 0022. |
| GEO Tester | `/geo` | **Motores reales** (Claude, ChatGPT, Perplexity) con búsqueda web y citas desde v0.56.0; modelos por motor en `/tokens`. AI Overview y Gemini como `Próx.`. |
| Perfiles | `/profiles` | Explorer con grid/tabla, filtros, CSV import/export, generación LLM (50 seeds), retratos IA (v0.57), el set de 15 perfiles IVI (`source = investigacion-publico-ivi-2026-06`) y el set de 3 perfiles de Adeslas Dental (`source = investigacion-publico-adeslas-dental-2026-06`). |
| Cerebro | `/cerebro` | **Base de conocimiento de marca** (v0.59-v0.60): crea Marcas con documentos `.md` (con flag privado/ZDR) y rellena los campos de marca vía selector en los 6 formularios (GEO, Momentum, Campañas, Copy, Pricing, Claridad 5s). |

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

El plan de mejora de campañas (v0.35 a v0.40) y los canales Meta/TikTok ya están completados. Candidatos vivos, por orden recomendado:

**A) Actividades IVI con los 15 perfiles (recomendado).** El paquete está listo para explotarse: claridad 5s sobre landings de ivi.es con los perfiles nuevos, relanzar las campañas IVI seed con esta muestra, Momentum con triggers de fertilidad (un seminograma alterado, el cumpleaños clave, la carta de exclusión de la pública, el diagnóstico oncológico: los disparadores están documentados por segmento en `IVI-PUBLICO-OBJETIVO.md`), y re-run del GEO IVI para empezar la serie temporal. **Antes: recargar el gateway** (~4 $ restantes; un run de campaña con 15 perfiles consume bastante más que un GEO).

**B) AI Overview como cuarto motor del GEO Tester.** Vía SerpAPI (alta en serpapi.com + env `SERPAPI_KEY`, ~1-2 céntimos/búsqueda): devuelve el bloque AI Overview REAL de Google con sus fuentes, en dos pasos con `page_token` que caduca en 1 minuto. Matiz honesto: no aparece para todas las queries y eso es señal GEO en sí. La pestaña «Próx.» ya existe en `app/geo/[id]/engine-tabs.tsx`.

**C) Monitorización GEO periódica.** Re-runs programados de los análisis GEO (cron de Vercel) y gráfica de evolución del visibility score por motor: la varianza entre runs documentada en `GEO-PRUEBA-IVI.md` hace que la foto única sea ruido y la tendencia sea el producto.

## Otros candidatos (aplazados)

### A) Implementar la 3ª estrategia de Google Ads

Las dos con más músculo son **Performance Max** y **Shopping** porque introducen tipos de input nuevos:

- **Performance Max**: feed de assets multi-formato + audience signals + objetivos de conversión. Permite probar la lógica de un mismo conjunto de assets recombinados por el motor.
- **Shopping**: feed de productos (title, price, image, GTIN, brand). Encaja con el módulo de Pricing existente.

**Demand Gen** y **Video / YouTube** son más visuales y dependen de un buen reproductor de vídeo en el preview.

### B) Activar el resto de canales (LinkedIn / X)

**Meta quedó implementado en v0.54.0 y TikTok en v0.55.0** siguiendo el patrón que conviene replicar para cada red nueva:

1. Investigar las specs oficiales (formatos, placements, caps técnicos vs visibles, CTAs).
2. Estrategias propias del canal en `STRATEGY_VALUES` + `CHANNEL_STRATEGIES` y campos específicos en `channel_spec` (jsonb, sin migración de columnas nuevas; sí amplía el check de `strategy`). Desde v0.55.0 `channel_spec` es un union discriminado: el spec nuevo debe declarar su `network` y sumarse a `ChannelSpec`, con helper `xSpecOf` propio.
3. Renders y framing por formato/placement en el runner + muestreo de variantes si la red lo hace.
4. Branch en el form con previews y validación en el `superRefine`.

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
