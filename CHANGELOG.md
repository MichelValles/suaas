# Changelog

Cambios notables de **Gravity**, agrupados por release y legibles de un vistazo. El detalle técnico versionado (desde v0.1, con fichero:línea y decisiones) vive en [`docs/ROADMAP.md`](./docs/ROADMAP.md). Formato inspirado en [Keep a Changelog](https://keepachangelog.com); versión en `lib/version.ts` y `package.json` (SemVer).

## [0.66.8 → 0.67.0] · 2026-07-22

Rediseño del sidebar: menos «dashboard de IA», inspiración en el patrón de BBVA, y modo contraído.

### Added

- **Modo contraído del sidebar**: botón «Contraer» al pie que reduce la navegación a un **rail de solo iconos** (72px, iconos centrados) y **persiste** entre sesiones (`gravity-sidebar-collapsed`). Al pasar el ratón, el rail **se despliega como overlay** (labels, planos y conmutador de tema) sin empujar el contenido. Solo en desktop; en móvil sigue siendo un drawer (`v0.67.0`).
- **Bordes redondeados** a la derecha del sidebar (arriba y abajo): el panel «flota» sobre el lienzo de la app (`v0.67.0`).

### Changed

- **Sidebar rediseñado** con inspiración en el patrón de BBVA pero con la paleta Gravity: fuera los labels de sección en mayúsculas mono, grupos separados por **líneas finas**, labels en Hanken sans, y **estado activo con el icono en un círculo relleno de acento** (`v0.66.8`).
- **Etiquetas de plano** (Construction, Acceleration, Value, Knowledge Tools, Sistema) reintroducidas junto a cada divisor, pero **discretas** (9px, sans, tenues): marcan el plano sin recuperar el registro «dashboard» (`v0.66.9`).

## [0.66.6] · 2026-07-21

Refinamientos de `/tokens` sobre la selección de modelo.

### Added

- **Tabla de tarifas por modelo** junto al selector de las runs: precio de entrada / salida (`$` por millón de tokens) de cada modelo del catálogo, con la fila del modelo vigente resaltada (`v0.66.5`).
- **Coste estimado por número de usuarios** por run (10 / 25 / 50 / 100), con el modelo elegido, en una tercera columna de la sección de runs. Usa el estimador real (medias de `gateway_usage`) y reacciona al modelo seleccionado (`v0.66.6`).

### Fixed

- Los `<select>` de modelo de `/tokens` mostraban el `<optgroup>` (p. ej. «Anthropic») en **blanco sobre blanco**: el fondo del control era casi transparente y el popup nativo caía al blanco del sistema. Ahora fondo opaco (`--surface-panel`) y color/fondo explícitos en `<select>`, `<optgroup>` y `<option>` (`v0.66.5`).

## [0.64.0 → 0.66.3] · 2026-07-20 / 21

Rediseño «oscuro editorial» completo (4 fases), selección de modelo en todo lo que gasta tokens, y renombrado de marca a Gravity.

### Added

- **Selección de modelo en `/tokens`, por empresa y modelo**, para todo lo que consume tokens: **chat** (Talker + Reasoner, `v0.65.0`), **tandas por lotes / runs** (los 9 runners, `v0.66.0`) y **GEO Tester** (por motor, ya existía). Persiste en `app_settings`; el chat y los runners leen la elección en runtime. Catálogo Anthropic + OpenAI.
- **Las estimaciones de coste** previas a lanzar reflejan el modelo elegido, no el default; elegir un modelo más caro o barato cambia la cifra prevista (`v0.66.2`).
- **Chat estilo WhatsApp** en el panel de perfil: cabecera con avatar y estado («escribiendo…»), burbujas con cola, hora, doble check, indicador de escritura. Theme-aware, preservando la arquitectura Talker-Reasoner (`v0.64.4`).
- **Motion de entrada**: los bloques de cada página aparecen con un fundido y subida escalonados; respeta `prefers-reduced-motion` (`v0.64.6`).
- **Firma orbital**: el diagrama del Gravity Model pasa a ser la firma visual del hero de la home y recurre como marca de agua (`v0.64.9`).

### Changed

- **Identidad tipográfica**: familia única **Hanken Grotesk** (fuera DM Serif Text y Nunito Sans); titulares a peso 700, **sin serif ni itálica** (la itálica queda para citas); acento amarillo de marca **`#F9CB0D`** (`v0.64.0`, `v0.64.1`).
- **Color**: superficies cálidas, **marfil sobre negro cálido** (`#0c0b0a`, paneles `#1a1815`); propagado por el canal `--fg`. Tema claro intacto (`v0.64.2`).
- **Masthead**: retirados los eyebrows mono en mayúsculas de las cabeceras de página (`v0.64.3`).
- **Home**: `max-width` de contenido y ritmo vertical más apretado; hero a dos columnas; módulos como **bloques planos, todos al mismo nivel** (sin tarjetas); breakpoint intermedio **~1120px** que apila el hero en el rango tablet (`v0.64.9`, `v0.65.1`, `v0.66.3`).
- **Cards**: refinadas al registro editorial (radio, sombra de hover, bordes más marcados) (`v0.64.5`, `v0.64.10`).
- **Accesibilidad**: subido el contraste del texto tenue, labels del sidebar y etiquetas del orbital; tamaños mínimos elevados; **iconos siempre en línea** con el texto (`v0.64.10`).
- **Marca**: renombrado **SUAAS → Gravity** en toda la documentación (73 apariciones), preservando los identificadores técnicos (dominio, env vars, cookie, tabla) (`v0.66.1`).

### Fixed

- Scroll horizontal en la página de perfil por un `.tooltip-panel` de COM-B que desbordaba (`v0.64.7`).
- Botón secundario amarillo poco legible sobre marfil en tema claro: relleno tenue + borde y texto más oscuros (`v0.64.10`).

### Removed

- Ruta de preview `/diseno-preview`, tras cerrar el rollout del rediseño (`v0.64.8`).
- Titulares con serifa/itálica y la variante de card destacada de la home.
