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
--font-sans     /* Hanken Grotesk */
--font-display  /* Hanken Grotesk (misma familia; se diferencia por peso y
                   tracking, NO por serifa) */
--font-mono     /* alias de Hanken Grotesk con tabular-nums */

--fs-eyebrow / --ls-eyebrow
--fs-caption / --fs-body / --fs-body-lg
--fs-h3 / --fs-h2 / --fs-h1 / --fs-display
```

**Refresh de identidad (v0.64.0, «oscuro editorial»)**: se jubila el par DM Serif Text + Nunito Sans y toda la app pasa a **una única grotesca, Hanken Grotesk**. Los titulares (`.h1`/`.h2`/`.display`) ya no llevan serifa ni cursiva: se diferencian por **peso (700) y tracking negativo**, no por familia. La cursiva queda reservada a las citas (backstory, respuestas VoC, narrativa de intención): **itálica = cita, nunca titular** (v0.64.1). El fallback del `--font-display` es sans (antes era `Times New Roman`, la fuga que hacía los títulos serif cuando la fuente no cargaba). El acento se fija en el amarillo de marca de Flat 101, `#F9CB0D`. La cursiva editorial (backstory, citas) sigue viniendo de `.backstory-box p` / `textarea.backstory-input`, ahora en Hanken itálica. Dirección validada en preview: negro/amarillo coherente con flat101.es, aire generoso, acento con cuentagotas, chat estilo WhatsApp. Fases siguientes: superficies cálidas, retirada de eyebrows, composición editorial por pantalla y chat WhatsApp en el panel real.

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
--fg              /* canal RGB del primer plano: "244, 242, 238" (marfil cálido)
                     en oscuro, "10, 11, 13" en claro. rgba(var(--fg), a) */
--surface-app     /* fondo del shell: #0c0b0a (negro cálido) / #f1ede4 (marfil) */
--surface-panel   /* sidebar, paneles: #1a1815 (panel cálido) / #faf7f0 */
--text-strong     /* titulares: #f7f5f1 (marfil) / ink-900 */
--text-secondary  /* texto secundario (eyebrow, caption): marfil 0.55 en oscuro,
                     ink 0.72 en claro. Garantiza AA sobre el lienzo claro */
--text-faint      /* texto terciario/tenue: marfil 0.42 / ink 0.6 */
--accent-text     /* texto accent: accent-500 / accent-800 (contraste AA en claro) */
--success-text / --warning-text / --error-text
                  /* estados como texto, legibles en ambos temas */
```

**Oscuro editorial cálido (v0.64.2, Fase 2 del rediseño)**: el tema oscuro dejó de ser blanco crudo sobre el negro azulado de la ink scale. El primer plano `--fg` baja de `255,255,255` a `244,242,238` (marfil), el lienzo `--surface-app` pasa de `ink-900` (`#0a0b0d`) a `#0c0b0a` (negro cálido), los paneles `--surface-panel` de `ink-800` (`#181b21`, azulado) a `#1a1815` (cálido) y los titulares `--text-strong` de `#fff` a `#f7f5f1`. Calcado del preview validado (Stripe/Linear, coherente con flat101.es). Como todo el chrome consume `rgba(var(--fg), a)`, la calidez se propaga sola a texto, bordes y rellenos; los mismos cambios se replican en `.theme-dark-fixed` (login, tooltips, bloques feature) para no dejar contextos fríos. El blanco puro deslumbraba y arrastraba el registro «dashboard de IA» que se quería evitar. AA intacto (marfil sobre negro cálido sigue > 18:1). El tema claro no se toca.

**Tema claro cálido y contraste AA (v0.57.3)**: el modo claro dejó de ser blanco puro. El lienzo (`--surface-app`) es un marfil cálido `#f1ede4` y los paneles/tarjetas un blanco roto `#faf7f0` un punto más claro, que resalta sobre el lienzo. En claro se calientan también `--paper`, `--ink-50/100/200`. El texto secundario y tenue ya no se escribe como `rgba(var(--fg), 0.55/0.42)` (washeaba a ~4,3:1 y ~2,9:1 sobre blanco): se enrutó por `--text-secondary` / `--text-faint`, que en claro suben el alfa para pasar AA (>= 4,5:1) y en oscuro conservan los valores previos (sin regresión). Por la misma razón el texto accent baja a `--accent-800` en claro.

Reglas:

- Texto secundario/tenue → `var(--text-secondary)` / `var(--text-faint)`, **no** `rgba(var(--fg), 0.55/0.42)` literal (no pasa contraste en claro). Cuerpo y titulares fuertes siguen con `rgba(var(--fg), 0.75+)` y `var(--text-strong)`.
- **Nunca** `rgba(255,255,255,x)` ni `color: "#fff"` en estilos de la app: usar `rgba(var(--fg), x)` y `var(--text-strong)`. El codemod de v0.33 migró las 791 ocurrencias.
- Texto en color accent → `var(--accent-text)`. Fondos y bordes accent → `var(--accent-500)` (funciona en ambos temas).
- Estados (done/running/error, approaching/stable/drifting, óptima/repesca/fuga) → tokens semánticos de texto, nunca hexes del semáforo Tailwind.
- Contextos que no cambian de tema: clase `.theme-dark-fixed` (login HUD, `/onboard`). `.surface-feature`, `.surface-paper`, `.surface-tone` y los tooltips redefinen el canal localmente, así sus descendientes heredan la paleta correcta.
- Los previews de anuncios (SERP, Display) emulan superficies reales: mantienen sus colores literales en ambos temas.
- **Colores de marca de las redes publicitarias**: excepción consciente. Los chips de canal usan `CHANNEL_BRAND` (`components/channel-icon.tsx`): Google #4285F4, Meta #9D00FF (morado, decisión propia para diferenciarlo de los azules de Google y LinkedIn), LinkedIn #0A66C2, TikTok #FE2C55, elegidos para leerse en ambos temas. X no tiene color (su marca es blanco/negro) y usa el chip neutro del tema. No reutilizar estos hexes fuera de la identidad de canal.

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
| `.spin-slow` | Rotación continua lenta (4s, lineal) sobre el mismo keyframe `spin`. Hoy la usa el disco de música del preview de TikTok en `/campaigns/new`. |
| `.serp-link` | Titular de anuncio estilo enlace de buscador (`color: var(--serp-link)`). El token es themable: azul SERP desaturado en oscuro, azul de enlace clásico en claro, fijo en `.theme-dark-fixed`. No hardcodear `rgba(132,192,255,…)`. |

## Chat estilo WhatsApp (panel de perfil, v0.64.4)

`app/profiles/[id]/chat-panel.tsx` presenta la conversación Talker-Reasoner con registro de app de mensajería, no de log de terminal:

- **Cabecera** con avatar del perfil, nombre en display 700 y línea de estado que alterna entre «Talker-Reasoner · en voz del perfil» y «escribiendo…» mientras el Reasoner/Talker trabajan.
- **Lienzo propio** (`--chat-wall`): superficie distinta del panel que la contiene, para que el hilo destaque. La sección va dentro de un `--surface-panel` con borde, y el lienzo es más profundo.
- **Burbujas con cola** (triángulo por `clipPath`): saliente (humano) a la derecha con `--chat-out` (amarillo de marca atenuado) y radio `14px 6px 14px 14px`; entrante (perfil) a la izquierda con `--chat-in` neutro y radio `6px 14px 14px 14px`. La entrante lleva avatar pequeño y nombre del perfil en accent.
- **Sello de mensaje**: hora local `HH:MM` (cliente, sin SSR) y, en las salientes, doble check en `--serp-link` (leído).
- **Tokens temables** `--chat-wall` / `--chat-in` / `--chat-out` / `--chat-out-border` (los tres bloques de tema): sólidos para que las colas casen y para que el chat funcione igual en claro que en oscuro. Nunca hardcodear los darks del preview.
- **«escribiendo…»**: tres puntos con `@keyframes chatTyping` (clase `.chat-typing-dot`) en una mini-burbuja entrante.
- La traza del Reasoner (abajo) mantiene el patrón `<details>` de la sección siguiente, indentada bajo la burbuja.

## Patrón "Razonamiento" colapsable (CoT)

`app/profiles/[id]/chat-panel.tsx` usa `<details>` nativo para exponer el plan del Reasoner bajo cada respuesta del Talker.

- Header (`<summary>`) en `.mono` 10px tracked, con `tono` y `esfuerzo` como chips.
- Body: `dl` con grid de 2 columnas (`auto 1fr`), `dt` en `.mono` minúsculas-tracked y `dd` en cuerpo.
- Borde `rgba(var(--fg),0.08)` y fondo `rgba(var(--fg),0.02)`: nunca un panel sólido para no robarle peso al mensaje del Talker.

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

Patrón de uso recomendado: trigger en círculo de 16×16 con la "i" alineado a la derecha del label de un campo o eyebrow. El panel aparece centrado encima con `width: max-content` (sin tope en px desde v0.61.4), fondo `var(--ink-800)` y texto blanco. Para datos puntuales sobre rasgos de personalidad (Big Five), los textos viven en `lib/big-five.ts` como fuente única.

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

## Componente `BrandContextBox`

`components/brand-context-box.tsx`. Caja para volcar el «Contexto de marca» en las vistas de resultados. Por defecto muestra un extracto (primeros 280 caracteres con «…»); si el texto es largo, aparece un botón «Ampliar» que despliega el contenido completo en una caja con `maxHeight: 320` y scroll vertical (botón «Reducir» para colapsar).

```tsx
import { BrandContextBox } from "@/components/brand-context-box";

{challenge.brand_context && <BrandContextBox text={challenge.brand_context} />}
```

Props:

- `text` *(string)*: el contexto de marca a mostrar.
- `label` *(string, opcional)*: eyebrow en `.mono`. Default `"Contexto de marca"`.

Es un client component (usa `useState` para el toggle). Úsalo en cualquier vista que vuelque el contexto de marca con esta plantilla (ahora `momentum/[id]`; reutilizable en futuros módulos).

## Patrón HUD (login)

`app/login/login-form.tsx` implementa un patrón "HUD oscuro":

- Fondo `var(--ink-900)`.
- Rejilla de 56×56 con líneas `rgba(var(--fg),0.04)` (el HUD vive bajo `.theme-dark-fixed`, que fija el canal a blanco).
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
- **PageHeading**: sin `maxWidth` en el wrapper ni topes en px; título y descripción ocupan el ancho disponible. Las "actions" quedan en el extremo derecho. Desde v0.61.8 el `eyebrow` es un breadcrumb (sin enlaces) por plano del Gravity Model: los índices llevan solo el plano (`CONSTRUCTION` / `ACCELERATION` / `KNOWLEDGE` / `SISTEMA`, y `GRAVITY` en la home) y las subpáginas `PLANO · Módulo`; el título es el nombre del módulo en los índices y el de la entidad o la acción en las subpáginas. Hereda el estilo uppercase tracked del eyebrow, así que renderiza en mayúsculas.
- **Iconos**: `lucide-react`. Importar individualmente (`Users`, `Target`, `Filter`, `Activity`, `Coins`, etc.) para que tree-shaking elimine el resto.

Reglas:
- ❌ No reintroducir el header superior con nav: el menú vive en el sidebar.
- ✅ Las nuevas páginas se añaden al sidebar editando `MAIN_ITEMS` o `SYSTEM_ITEMS` en `components/sidebar.tsx`. Con un icono lucide y un `href`.
- ⚠️ El `<main>` ya no tiene un container central de 1280: el ancho útil lo determina el grid del shell menos el sidebar. Desde v0.61.4 el front no usa `max-width`/`maxWidth` con valor en px (se retiraron todas): los bloques fluyen al ancho disponible. Si un bloque necesita acotarse, usar valores relativos (`%`, `clamp`, `ch`) y centrar con `marginInline: "auto"`, nunca un tope en px.

## Antipatrones

- ❌ Importar Tailwind o utility classes.
- ❌ Inventar tokens fuera de la lista: si necesitas un color o espaciado nuevo, propón añadirlo a `globals.css` y a este doc, no lo metas inline en un solo sitio.
- ❌ Animar atributos SVG `x`/`y` con motion (duplica posición porque se suma transform al atributo). Solo animar `opacity`.
- ❌ Usar raw `#000` o `#fff` para texto/fondos. Siempre `--ink-900` / `--paper` (o `--text-strong` / `--surface-app` si debe responder al tema).
- ❌ `rgba(255,255,255,x)` hardcodeado en estilos de la app: rompe el modo claro. Usar `rgba(var(--fg), x)`.
- ❌ Saturar con más de un accent. El amarillo `--accent-500` es el único color brand. Los hexes de la paleta Tailwind (`#60a5fa`, `#fb923c`, `#a78bfa`, `#4ade80`, `#f87171`...) están prohibidos: son la firma visual del diseño-por-LLM.
- ❌ Glow exterior / neón (`box-shadow` con blur de color). Elevación con borde de 1px; énfasis con peso y tamaño.
- ❌ Aplicar `maxWidth`/`max-width` con valor en px (`maxWidth: 1100`, `max-width: 720px`...) a secciones o bloques de página: el front no usa topes en px (se retiraron en v0.61.4) y el ancho lo gobierna el grid del AppShell. Para acotar, valores relativos (`%`, `clamp`, `ch`). Excepción válida: los breakpoints `@media (max-width: …)`.
- ❌ Diferenciar categorías conceptuales con un color por categoría (los «tres planos» de colores). Diferenciar con numeración editorial (`01 · 02 · 03` en accent), jerarquía tipográfica o alphas del canal `--fg`.

## Patrón: descripción destacada (`descriptionVariant="panel"`)

Desde v0.17.0, `PageHeading` acepta `descriptionVariant: "inline" | "panel"`. Cuando vale `"panel"` la descripción se renderiza como caja con borde-izquierdo accent (3px) + borde sutil arriba/derecha/abajo, padding 26/30 y fontSize `clamp(15-17)`. Usado en las 9 páginas que muestran copy descriptivo de una entidad (4 detalle + 5 results). Para metadata corta o URL fuente, mantener `inline` (default).

```tsx
<PageHeading
  eyebrow="KNOWLEDGE · Pricing"
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

No confundir con el borrado local de formularios: desde v0.54.5 las filas repetibles de los forms `/new` usan un icono plano de papelera (`components/remove-icon-button.tsx`, mismo lenguaje visual que la variante `inline` de `SendToTrashButton`) en lugar de un `btn-pill` «Eliminar», y el icono solo se renderiza cuando la fila se puede eliminar (sin iconos deshabilitados). Aplica a los 5 forms con filas repetibles: campañas (filas y creatividades), copy (bloques), pricing (niveles), embudos (pasos) y GEO (segmentos). Eso desatura la interfaz de botones: los `btn-pill` quedan para añadir filas, alternar tipos, mover y enviar.

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
- `opacity: 0.6` (en `ChannelTabs`) o color desaturado (`rgba(var(--fg),0.35)`).
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
