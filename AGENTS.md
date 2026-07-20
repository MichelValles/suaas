# This is NOT the Next.js you know

Esta versión (Next 16.2.6) tiene breaking changes vs. el training data del LLM. Antes de tocar APIs de Next.js, consultar `node_modules/next/dist/docs/`. Heed deprecation notices.

# Sistema de diseño

Gravity adopta el design system de **sd.michelvalles.com** pero con una variante crítica:

- **NO usa Tailwind**. Ni `@import "tailwindcss"`, ni utility classes (`flex`, `min-h-screen`, `p-4`, `bg-*`, etc.).
- Sólo usa los **tokens CSS** definidos en `:root` de `app/globals.css` y las **clases semánticas** del sistema (`.eyebrow`, `.h1`, `.h2`, `.h3`, `.display`, `.body`, `.body-lg`, `.caption`, `.mono`, `.btn-pill`, `.btn-pill.solid`, `.hl`, `.surface-feature`, `.surface-paper`, `.surface-tone`).
- Para layout: CSS inline con `style={{}}`, CSS modules o reglas en `globals.css`. **Nunca** atajos de Tailwind.

Tokens disponibles (resumen): `--ink-{50..900}`, `--accent-{50..900}`, `--paper`, `--space-{1..10}`, `--radius-{xs,sm,md,lg,pill}`, `--fs-{eyebrow,caption,body,body-lg,h3,h2,h1,display}`, `--font-sans`, `--font-display`, `--font-mono`, `--dur-{micro,short,med,long}`, `--ease-out`, `--ease-in-out`, `--shadow-{flat,rest,hover}`.

**Temas (v0.33)**: oscuro por defecto, claro vía `html[data-theme="light"]` (switch al pie del sidebar). Colores de primer plano SIEMPRE vía el canal de tema: `rgba(var(--fg), alpha)` para texto/bordes/rellenos, `var(--text-strong)` para titulares, `var(--accent-text)` para texto accent, `var(--surface-app)` / `var(--surface-panel)` para superficies, `--{success,warning,error}-text` para estados. Prohibido `rgba(255,255,255,x)`, `color: "#fff"` y hexes de la paleta Tailwind. Contextos siempre oscuros: clase `.theme-dark-fixed`.

# Reglas de redacción

- **Nunca usar em-dash (`—`)** en texto visible. Sustituir por coma, dos puntos, paréntesis o punto.
- Castellano con acentos completos. Nunca diacríticos en ASCII.
- Comillas tipográficas «…» o "…" cuando rodean destacados.
- Números: separador de miles con punto (formato español).
