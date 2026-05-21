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
| `.surface-feature` | Fondo `ink-900`, texto blanco, títulos accent. |
| `.surface-paper` | Fondo `paper`. |
| `.surface-tone` | Fondo `ink-50` neutro. |

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

## Antipatrones

- ❌ Importar Tailwind o utility classes.
- ❌ Inventar tokens fuera de la lista: si necesitas un color o espaciado nuevo, propón añadirlo a `globals.css` y a este doc, no lo metas inline en un solo sitio.
- ❌ Animar atributos SVG `x`/`y` con motion (duplica posición porque se suma transform al atributo). Solo animar `opacity`.
- ❌ Usar raw `#000` o `#fff` para texto/fondos. Siempre `--ink-900` / `--paper`.
- ❌ Saturar con más de un accent. El amarillo `--accent-500` es el único color brand.

## Cómo añadir un componente reutilizable

1. Crearlo en `components/` con estilos via `style={{...}}` o CSS module.
2. Si reutiliza patrones nuevos (más de un sitio), añadir clase semántica a `globals.css`.
3. Documentar en este archivo: nombre, props mínimas, ejemplo.
4. Bump de versión (patch o minor según cambio) en `lib/version.ts` y `package.json`.
