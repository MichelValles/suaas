# Changelog

Cambios notables de **Gravity**, agrupados por release y legibles de un vistazo. El detalle técnico versionado (desde v0.1, con fichero:línea y decisiones) vive en [`docs/ROADMAP.md`](./docs/ROADMAP.md). Formato inspirado en [Keep a Changelog](https://keepachangelog.com); versión en `lib/version.ts` y `package.json` (SemVer).

## [0.69.0] · 2026-07-22

Capa de observabilidad: inspector de llamadas al modelo.

### Added

- **Página `/observabilidad`**: inspector de las llamadas individuales al AI Gateway (antes solo había agregados en `/tokens`). Cada llamada con su fecha, scope, modelo, tokens, **coste real en USD**, latencia y estado (ok/fallo), filtrable por modelo/scope/solo-fallidas y paginado. El coste se calcula al vuelo (tokens × tarifa) y por primera vez es visible por llamada. Primer paso de una capa de observabilidad; la evaluación de calidad de las salidas y la comparación de modelos quedan como siguiente fase.

## [0.68.0] · 2026-07-22

Perfiles: origen visible en la rejilla y cliente de optimización.

### Added

- **Origen del perfil en la rejilla**: icono de estrellas (accent) para los perfiles modelados para un cliente y de formulario (tenue) para los perfiles base, con el cliente en el tooltip al pasar el ratón.
- **Cliente de optimización del perfil** (`optimized_for`): se elige en el editor (alta y edición) y en la ficha con edición inline, con sugerencias de las marcas ya usadas en la app (Cerebro y GEO: IVI, SegurCaixa Adeslas Dental, O2 Spain…). Nueva columna en `profiles` (migración `0030`).
- **Los perfiles de clientes ya vienen etiquetados**: 3 modelados para **SegurCaixa Adeslas Dental** y 15 para **IVI** (identificados por el tema de su backstory: dental vs. fertilidad); el resto quedan como perfiles base del formulario, editables para asignarles cliente cuando toque.

## [0.67.3] · 2026-07-22

Normalización de las tarjetas de módulo.

### Changed

- **geo y momentum usan la tarjeta compartida** (`EntityCard`/`EntityListView`), como campañas, claridad, copy, pricing, embudos y A/B. Antes eran cards a medida: geo con fondo oscuro fijo (`.surface-feature`) y momentum en lista vertical. Ahora los 8 listados de módulo comparten diseño (cabecera, título, descripción, pie de stats, hover-lift, tema claro/oscuro) y toolbar de búsqueda + orden. Claridad mantiene la imagen del test de 5s en su tarjeta (`v0.67.3`).

## [0.66.8 → 0.67.2] · 2026-07-22

Rediseño del sidebar: menos «dashboard de IA», inspiración en el patrón de BBVA, y modo contraído.

### Added

- **Modo contraído del sidebar**: botón «Contraer» al pie que reduce la navegación a un **rail de solo iconos** (72px, iconos centrados) y **persiste** entre sesiones (`gravity-sidebar-collapsed`). Al pasar el ratón, el rail **se despliega como overlay** (labels, planos y conmutador de tema) sin empujar el contenido. Solo en desktop; en móvil sigue siendo un drawer (`v0.67.0`).
- **Bordes redondeados** a la derecha del sidebar (arriba y abajo): el panel «flota» sobre el lienzo de la app (`v0.67.0`).
- **Marca «101»** recortada del logo, centrada en la cabecera del rail contraído (el logotipo completo reaparece al desplegar), en vez de perder la marca (`v0.67.1`).

### Fixed

- **Sidebar sin scroll vertical** en ambos estados: espaciado base compactado (gap, padding, filas, dividers y gaps de grupo) para que la navegación entre en el viewport sin barra de scroll; en el rail contraído se ocultan además las etiquetas de plano y el conmutador de tema para ganar alto (`v0.67.1`).
- **Sin salto de iconos al desplegar el rail**: al pasar el ratón los iconos ya no se movían. Las etiquetas de plano reservan su alto también contraídas (solo se funden), la marca «101» se iguala en altura al logotipo y el conmutador de tema no aparece en el hover, de modo que ni la cabecera ni el pie cambian de alto (`v0.67.2`).

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
