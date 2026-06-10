# Sistema de diseño

SUAAS adopta el design system de **sd.michelvalles.com** con una variante crítica respecto a `flat101business` (adams/uoc): **no usa Tailwind**.

## Regla núcleo: no Tailwind

- ❌ No `@import "tailwindcss"` en `globals.css`.
- ❌ No `@theme inline`.
- ❌ No utility classes (`flex`, `min-h-screen`, `p-4`, `bg-ink-900`, `text-accent-500`, etc.).
- ❌ No `tailwind-merge`, no `clsx` con propósito Tailwind.
- ✅ Sí tokens CSS de `:root` en `app/globals.css`.
- ✅ Sí clases semánticas del DS (`.eyebrow`, `.h1`, `.btn-pill`...).
- ✅ Sí CSS inline (`style={{...}}`) o reglas CSS estándar para layout.

Por qué: SUAAS no es un deck editorial sino una herramienta de producto. El DS de sd.michelvalles.com está pensado como token system, no como Tailwind. Usándolo desnudo evitamos arrastrar dependencias y mantenemos la superficie de estilo legible.

## Tokens disponibles

### Color (escala `ink` neutra + `accent` amarillo)

```css
--paper          /* #ffffff */
--ink-50 ... --ink-900     /* tinted neutrals, nunca raw #000/#fff */
--accent-50 ... --accent-900  /* único color saturado, base #facc0d */
--brand-flat     /* #0a0b0d */

/* semantic (data viz / status) */
--success-{100,500,700}
--warning-{100,500,700}
--error-{100,500,700}
--info-{100,500,700}
```

### Tipografía

```css
--font-sans     /* Nunito Sans */
--font-display  /* DM Serif Text */
--font-mono     /* alias de Nunito Sans con tabular-nums */

--fs-eyebrow / --ls-eyebrow
--fs-caption / --fs-body / --fs-body-lg
--fs-h3 / --fs-h2 / --fs-h1 / --fs-display
```

### Espaciado, radios, sombras

```css
--space-1..10        /* 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 */
--radius-xs..lg, --radius-pill, --radius
--shadow-flat / --shadow-rest / --shadow-hover
```

### Motion

```css
--dur-micro     150ms
--dur-short     300ms
--dur-med       500ms
--dur-long      800ms
--ease-out      cubic-bezier(0.22, 1, 0.36, 1)
--ease-in-out   cubic-bezier(0.65, 0, 0.35, 1)
```

### Tema (v0.33)

Oscuro por defecto. `html[data-theme="light"]` activa el modo claro. El conmutador vive al pie del sidebar (`components/theme-switch.tsx`), persiste en `localStorage` (`suaas-theme`) y un script inline en `app/layout.tsx` aplica la preferencia antes del primer paint.

```css
--fg              /* canal RGB del primer plano: "255, 255, 255" en oscuro,
                     "10, 11, 13" en claro. Se consume como rgba(var(--fg), a) */
--surface-app     /* fondo del shell: ink-900 / paper */
--surface-panel   /* sidebar, paneles: ink-800 / ink-50 */
--text-strong     /* titulares: #fff / ink-900 */
--accent-text     /* texto accent: accent-500 / accent-700 (contraste en claro) */
--success-text / --warning-text / --error-text
                  /* estados como texto, legibles en ambos temas */
```

Reglas:

- **Nunca** `rgba(255,255,255,x)` ni `color: "#fff"` en estilos de la app: usar `rgba(var(--fg), x)` y `var(--text-strong)`. El codemod de v0.33 migró las 791 ocurrencias.
- Texto en color accent → `var(--accent-text)`. Fondos y bordes accent → `var(--accent-500)` (funciona en ambos temas).
- Estados (done/running/error, approaching/stable/drifting, óptima/repesca/fuga) → tokens semánticos de texto, nunca hexes del semáforo Tailwind.
- Contextos que no cambian de tema: clase `.theme-dark-fixed` (login HUD, `/onboard`). `.surface-feature`, `.surface-paper`, `.surface-tone` y los tooltips redefinen el canal localmente, así sus descendientes heredan la paleta correcta.
- Los previews de anuncios (SERP, Display) emulan superficies reales: mantienen sus colores literales en ambos temas.

## Clases semánticas disponibles

| Clase | Uso |
|---|---|
| `.eyebrow` | Eyebrow uppercase tracked sobre títulos. |
| `.h1` / `.h2` / `.h3` | Encabezados. h1/h2 en DM Serif italic. |
| `.display` | XXL hero italic. |
| `.body` / `.body-lg` / `.caption` | Cuerpo. |
| `.mono` | Tabular-nums Nunito para metadatos y HUD. |
| `.btn-pill` | Pill outline con accent. Modificador `.solid` invierte. |
| `.hl` | Highlight inline con fondo accent. |
| `.feature-card` | Tarjeta clicable de módulo (icono + título + body + CTA). Altura uniforme `100%` para grids `auto-fit`. Hover-lift con borde accent. |
| `.entity-card` | Plantilla de los listados de entidades testeables (targets, funnels, ab, copy, pricing, campaigns). Cabecera (eyebrow + trash overlay), body (título italic + descripción) y pie de stats (runs · perfiles · característica · fecha). Vive en `components/entity-card.tsx`. |
| `.backstory-box` | Caja para mostrar el backstory de un perfil como cita en cursiva display. Glifo decorativo `"` en accent. Variante `.backstory-box--compact` para usos embebidos. |
| `textarea.backstory-input` | Tratamiento cursiva display para el textarea de backstory en formularios. |
| `.surface-feature` | Fondo `ink-900`, texto blanco, títulos accent. |
| `.surface-paper` | Fondo `paper`. |
| `.surface-tone` | Fondo `ink-50` neutro. |
| `.spin` | Rotación continua (1s, lineal) para iconos de carga tipo `Loader2`. No redefinir el keyframe `spin` en cada página: ya es global. |

## Patrón "Razonamiento" colapsable (CoT)

`app/profiles/[id]/chat-panel.tsx` usa `<details>` nativo para exponer el plan del Reasoner bajo cada respuesta del Talker.

- Header (`<summary>`) en `.mono` 10px tracked, con `tono` y `esfuerzo` como chips.
- Body: `dl` con grid de 2 columnas (`auto 1fr`), `dt` en `.mono` minúsculas-tracked y `dd` en cuerpo.
- Borde `rgba(255,255,255,0.08)` y fondo `rgba(255,255,255,0.02)`: nunca un panel sólido para no robarle peso al mensaje del Talker.

Si reutilizas el patrón para otra traza meta, factoriza a `<Disclosure>` en `components/`.

## Componente `InfoTooltip`

`components/info-tooltip.tsx` + clases `.tooltip-host`, `.tooltip-trigger`, `.tooltip-panel` en `globals.css`. Tooltip CSS-only: se muestra con `:hover` o `:focus-within` sobre el host. Cero JS, vive en Server Components.

```tsx
import { InfoTooltip } from "@/components/info-tooltip";

<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
  <span className="mono">Apertura</span>
  <InfoTooltip
    text="Curiosidad por lo nuevo, ideas abstractas, arte."
    label="Sobre Apertura"
  />
</span>
```

Props:

- `text` *(string)*: contenido del panel. Máximo 1-2 frases.
- `label` *(string, opcional)*: `aria-label` del trigger. Default `"Información"`.

Patrón de uso recomendado: trigger en círculo de 16×16 con la "i" alineado a la derecha del label de un campo o eyebrow. El panel aparece centrado encima con `max-width: 260px`, fondo `var(--ink-800)` y texto blanco. Para datos puntuales sobre rasgos de personalidad (Big Five), los textos viven en `lib/big-five.ts` como fuente única.

## Componente `ResultBar`

`components/result-bar.tsx`. Barra horizontal de 6 px con valor 0..1, label en `.mono` arriba a la izquierda y porcentaje a la derecha. Hint opcional debajo.

```tsx
import { ResultBar } from "@/components/result-bar";

<ResultBar
  label="Comprensión media"
  value={0.62}
  hint="9 de 14 perfiles recordaron la promesa principal."
/>
```

Props:

- `label` *(string)*: eyebrow en `.mono` 10px tracked.
- `value` *(0..1)*: clamp interno, se pinta como porcentaje entero.
- `hint` *(string, opcional)*: línea pequeña debajo.
- `tone` *(`accent` | `muted` | `warn`)*: color del relleno. Default `accent`.

Reutilízalo para cualquier ratio normalizado (porcentaje de éxito, recall, share). Si necesitas varias barras alineadas verticalmente, envuélvelas en un grid de columna única o un `auto-fit` con `minmax(280px, 1fr)`.

## Patrón HUD (login)

`app/login/login-form.tsx` implementa un patrón "HUD oscuro":

- Fondo `var(--ink-900)`.
- Rejilla de 56×56 con líneas `rgba(255,255,255,0.04)`.
- Viñeta radial hacia los bordes `rgba(10,11,13,0.7)`.
- Cuatro corchetes en esquinas en `var(--accent-500)`.
- Pixel trail: cuadrados 8×8 amarillos snap-to-grid bajo el cursor (solo en `hover: hover`).
- Logo Flat 101 invertido (`filter: brightness(0) invert(1)`).
- Display italic centrado, formulario con underline animado.

Si se reusa para otra pantalla, factorizar a un componente `<HudFrame>` en `components/`.

## Layout: app shell con sidebar (v0.6.0+)

Desde v0.6.0 SUAAS usa un app shell tipo software, no web. `AppShell` aplica un grid:

```
┌─────────┬───────────────────────┐
│         │   <main>              │
│ sidebar │                       │
│ (240px) ├───────────────────────┤
│         │   <footer> badges     │
└─────────┴───────────────────────┘
```

- **Sidebar**: cliente (`components/sidebar.tsx`). En desktop ≥881px queda fijo a la izquierda. En móvil <881px se oculta y aparece un botón hamburguesa que abre la sidebar como overlay con backdrop. Los enlaces activos se resaltan con `data-active="true"` (clase `.sidebar-link`).
- **Footer**: badges de estado (`.status-badge[data-status="ok|warn|off"]`) para Supabase y AI Gateway. Verdes cuando `isSupabaseConfigured()` / `isGatewayConfigured()` devuelven `true`.
- **PageHeading**: sin maxWidth en el wrapper; el `<h1>` (720) y `<p>` (640) limitan internamente. Las "actions" quedan en el extremo derecho.
- **Iconos**: `lucide-react`. Importar individualmente (`Users`, `Target`, `Filter`, `Activity`, `Coins`, etc.) para que tree-shaking elimine el resto.

Reglas:
- ❌ No reintroducir el header superior con nav: el menú vive en el sidebar.
- ✅ Las nuevas páginas se añaden al sidebar editando `MAIN_ITEMS` o `SYSTEM_ITEMS` en `components/sidebar.tsx`. Con un icono lucide y un `href`.
- ⚠️ El `<main>` ya no tiene un container central de 1280: el ancho útil lo determina el grid del shell menos el sidebar. Bloques con `maxWidth` interno deben centrarse con `marginInline: "auto"` si quieren no quedarse pegados al borde izquierdo.

## Antipatrones

- ❌ Importar Tailwind o utility classes.
- ❌ Inventar tokens fuera de la lista: si necesitas un color o espaciado nuevo, propón añadirlo a `globals.css` y a este doc, no lo metas inline en un solo sitio.
- ❌ Animar atributos SVG `x`/`y` con motion (duplica posición porque se suma transform al atributo). Solo animar `opacity`.
- ❌ Usar raw `#000` o `#fff` para texto/fondos. Siempre `--ink-900` / `--paper` (o `--text-strong` / `--surface-app` si debe responder al tema).
- ❌ `rgba(255,255,255,x)` hardcodeado en estilos de la app: rompe el modo claro. Usar `rgba(var(--fg), x)`.
- ❌ Saturar con más de un accent. El amarillo `--accent-500` es el único color brand. Los hexes de la paleta Tailwind (`#60a5fa`, `#fb923c`, `#a78bfa`, `#4ade80`, `#f87171`...) están prohibidos: son la firma visual del diseño-por-LLM.
- ❌ Glow exterior / neón (`box-shadow` con blur de color). Elevación con borde de 1px; énfasis con peso y tamaño.
- ❌ Aplicar `maxWidth: 1100` (u otros valores genéricos) a secciones de página: el container global del AppShell ya centra a 1280.
- ❌ Diferenciar categorías conceptuales con un color por categoría (los «tres planos» de colores). Diferenciar con numeración editorial (`01 · 02 · 03` en accent), jerarquía tipográfica o alphas del canal `--fg`.

## Patrón: descripción destacada (`descriptionVariant="panel"`)

Desde v0.17.0, `PageHeading` acepta `descriptionVariant: "inline" | "panel"`. Cuando vale `"panel"` la descripción se renderiza como caja con borde-izquierdo accent (3px) + borde sutil arriba/derecha/abajo, padding 26/30 y fontSize `clamp(15-17)`. Usado en las 9 páginas que muestran copy descriptivo de una entidad (4 detalle + 5 results). Para metadata corta o URL fuente, mantener `inline` (default).

```tsx
<PageHeading
  eyebrow="Oferta · 3 precios"
  title={offer.name}
  description={offer.description}
  descriptionVariant="panel"
  actions={<Link href="/pricing" className="btn-pill">Volver</Link>}
/>
```

## Patrón: EntityCard + EntityListView

Desde v0.15.0 los 5 listados (claridad, embudos, ab, copy, pricing) comparten:

- `<EntityCard>` (`components/entity-card.tsx`): tarjeta con fecha arriba (eyebrow accent), título display italic, descripción clamp 2 líneas, stats al pie. Media opcional 16:9 (sólo claridad).
- `<EntityListView>` (`components/entity-list.tsx`): wrapper con búsqueda (toolbar con padding generoso, ver v0.16.2) + sort (más reciente/antiguo/A-Z/Z-A/más runs/más perfiles) + grid `auto-fill` con `minmax(320, 1fr)` y gap 20.

Cada listado mapea su entidad a `EntityListItem` (id, href, trash, title, description, createdAt, runs, users, stats, media?). El componente no conoce el modelo concreto.

## Patrón: RunsPreviousGrid

`components/runs-previous.tsx` muestra cards de runs previos en las 5 páginas de detalle. Cada card lleva fecha + status badge + grid de métricas (N perfiles + 1-3 métricas configurables por entidad) + enlace "Ver resultados →". Sustituyó al patrón tabla en v0.14.0.

## Patrón: papelera (`SendToTrashButton` + `/trash`)

Desde v0.13.0 las entidades soportan soft delete vía `deleted_at` (migración 0007; la 0017 lo extiende a geo, momentum y perfiles, 9 tipos en total). En cada card hay un botón `<SendToTrashButton>` que envía a la papelera (geo y momentum usan server actions propias con la misma semántica soft; perfiles usa `DELETE /api/profiles/[id]`, también soft); en `/trash` aparecen los elementos borrados con "Restaurar" y "Eliminar definitivamente". `lib/trash.ts` orquesta soft delete / restore / hard delete por tipo.

## Espaciado vertical entre PageHeading y secciones

Desde v0.26.2 `.app-shell-main` es `display: flex; flex-direction: column; gap: clamp(32px, 4vw, 56px)`. Esto da espacio consistente entre el `PageHeading` y la primera section / ol que renderice cada página. Las páginas que envuelven todo en un wrapper flex propio (home, `/trash`, `/seed-examples`) no se ven afectadas porque entonces main sólo tiene 1 hijo directo y el `gap` no aplica con un único elemento.

Por la misma razón, **no metas tu propio wrapper flex en una página normal** si lo único que necesitas es espaciado entre secciones: el shell ya lo da.

## Panel 3x3 de la home

`/` renderiza una única sección «Panel» con 9 `<FeatureCard>` en un grid `auto-fit minmax(260px, 1fr)`. En desktop salen 3×3, en móvil 1 columna. Las cards son: Claridad 5s · Embudos · A/B · Copy · Pricing · Campañas · Perfiles · Tokens · Diag. Si añades un módulo nuevo, mantén la composición 3×N (con N múltiplo de 3) para evitar huérfanos.

## Iconos por canal y estrategia (módulo Campañas)

- `components/channel-icon.tsx`: SVGs monocromos inline (`currentColor`) para `google · meta · linkedin · tiktok · x`. Sin dependencias externas. Heredan el color de su padre.
- `components/strategy-icon.tsx`: switch sobre lucide-react para las 7 estrategias (`Search · Image · Sparkles · TrendingUp · Play · Smartphone · ShoppingBag`).

Patrón de uso: dentro de un chip o de una pestaña, con un `display: inline-flex; gap: 8` para alinearlos con el label.

## Patrón: pestañas con badge "Próx." para features incompletas

Cuando una pestaña / opción está modelada pero no implementada todavía (canales no-Google, estrategias no-Search/Display), se renderiza con:

- `cursor: not-allowed`.
- `opacity: 0.6` (en `ChannelTabs`) o color desaturado (`rgba(255,255,255,0.35)`).
- Chip `Próx.` en `.mono` con `padding: 2px 6px`, `borderRadius: var(--radius-pill)`, borde sutil.
- `title` con explicación: "En construcción · [descripción larga]".
- Si se hace click, no llama a `onChange`.

Cuando la feature se implementa, basta con que `isFeatureImplemented(value)` devuelva `true` para que el badge desaparezca y la pestaña se active.

## Patrón: preview en vivo de anuncio

`/campaigns/new` muestra a la derecha un panel sticky con un mockup del anuncio. El layout es **2 columnas** (`grid-template-columns: minmax(0, 1fr) minmax(0, 360px)`):

- Izquierda: el formulario completo.
- Derecha: preview vivo que se actualiza con cada keystroke.

El preview se elige por strategy:
- **Search**: SERP textual (URL display + titular azul + descripción gris) en `<SearchAdPreview>`.
- **Display**: card con imagen landscape 1.91:1 arriba, logo + company + URL, titular largo grande, headline corto en azul, descripción y botón CTA en `<DisplayAdPreview>`.

Si reutilizas el patrón para Performance Max u otras strategies, factoriza cada preview a un componente sibling y selecciona con un switch.

## Cómo añadir un componente reutilizable

1. Crearlo en `components/` con estilos via `style={{...}}` o CSS module.
2. Si reutiliza patrones nuevos (más de un sitio), añadir clase semántica a `globals.css`.
3. Documentar en este archivo: nombre, props mínimas, ejemplo.
4. Bump de versión (patch o minor según cambio) en `lib/version.ts` y `package.json`.
