# Siguiente paso (handoff)

> Archivo vivo para retomar la sesión. Actualizar al cerrar cada sprint.
> Última actualización: 2026-06-09 tras v0.28.0 (auditoría de seguridad).

## Estado actual (v0.28.0 desplegada)

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

Sistemas auxiliares: `/diag`, `/tokens`, `/trash` (soft delete con `deleted_at`), `/seed-examples` (siembra los 6 módulos en una pasada con gate).

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

Tres opciones en orden de impacto:

### A) Implementar la 3ª estrategia de Google Ads

Las dos con más músculo son **Performance Max** y **Shopping** porque introducen tipos de input nuevos:

- **Performance Max**: feed de assets multi-formato + audience signals + objetivos de conversión. Permite probar la lógica de un mismo conjunto de assets recombinados por el motor.
- **Shopping**: feed de productos (title, price, image, GTIN, brand). Encaja con el módulo de Pricing existente.

**Demand Gen** y **Video / YouTube** son más visuales y dependen de un buen reproductor de vídeo en el preview.

### B) Activar multi-canal real (Meta / LinkedIn / TikTok / X)

El esquema `channels text[]` ya está. Falta:

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
