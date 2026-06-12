@AGENTS.md

# Reglas operativas del proyecto SUAAS

SUAAS es una plataforma para hacer **test de UX/CRO con perfiles calibrados**, expuesta en `suaas.flat101.business`. Stack: Next.js 16 (App Router) + Supabase + Vercel AI Gateway. Sin Tailwind, sólo tokens del design system de sd.michelvalles.com.

## 1. Documentación viva en `docs/`

Antes de empezar a trabajar, **leer `docs/README.md`** para orientarte. La documentación cubre:

- `docs/PROYECTO.md` — qué es, stack, estructura, auth, modelo de datos.
- `docs/SISTEMA-DISENO.md` — tokens, componentes, antipatrones, regla de "no Tailwind".
- `docs/DESARROLLO.md` — comandos, deploy, env vars, troubleshooting.
- `docs/ROADMAP.md` — qué está hecho, qué falta, decisiones pendientes.
- `docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md` — base de conocimiento que fundamenta la plataforma (fidelidad grounded, Talker-Reasoner, métricas, riesgos).

**Cada vez que hagas un cambio funcional**, revisa si afecta a algún archivo de `docs/` y **actualízalo en la misma sesión**. Si dudas, actualiza.

## 2. Deploy + bump de versión + commit en cada cambio

Tras completar cualquier cambio funcional (no para exploraciones o lecturas), el flujo es:

1. **Editar** los archivos del cambio.
2. **Actualizar `docs/`** si aplica (regla 1).
3. **Bump de versión** en `lib/version.ts` Y `package.json` (mantenerlos sincronizados):
   - **patch** (+0.0.1): `fix`, `refactor`, `docs`, `chore`.
   - **minor** (+0.1.0): `feat` (nueva ruta, módulo, integración).
   - **major** (+1.0.0): cambio estructural o breaking.
4. **Deploy a producción**: `vercel --prod --yes`. Esperar a "Deployment ready" y confirmar la URL final (`https://suaas.flat101.business`).
5. **Commit** con mensaje en castellano siguiendo la convención (`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`). Incluir el bump de versión en el mismo commit.
6. **Actualizar el repositorio git**: si hay `git remote` configurado, hacer `git push`. Si no lo hay, el commit local ya cuenta como "actualizar git".

No batches varios cambios sin hacer deploy. Cada cambio = un ciclo completo cambio → bump → deploy → commit → push. Si el usuario pide explícitamente lo contrario ("solo edita, no deployes"), respeta esa instrucción puntual.

La versión se imprime en la consola del navegador al cargar (`components/console-banner.tsx`) y sirve para verificar visualmente que el deploy se ha propagado.

## 3. Reglas de redacción (críticas)

### NUNCA usar el em-dash (`—`) en el texto

Aplica a cualquier texto visible: copy, intros, body, labels, alt, metadatos, mensajes de error, README. Sin excepciones. Sustituir por coma, dos puntos, paréntesis o un punto según el ritmo.

- ❌ "Hablamos con perfiles calibrados — afinados con VoC real."
- ✅ "Hablamos con perfiles calibrados: afinados con VoC real."

### Otras reglas de copy

- El término de producto es **«perfiles calibrados»** (en el onboard, «gemelo digital»). No usar «usuarios sintéticos» en texto visible ni en prompts; queda reservado a la base teórica (`docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`) y a los registros históricos. SUAAS es marca pura, sin expansión del acrónimo.
- Castellano con acentos completos. Nunca sustituir diacríticos por ASCII.
- Comillas tipográficas «…» o "…" en lugar de "…" cuando rodean texto destacado.
- Números: separador de miles con punto (formato español).

## 4. Sistema de diseño

- **Prohibido** Tailwind (no utility classes, no `@import "tailwindcss"`, no `@theme inline`).
- Sólo tokens CSS de `app/globals.css` + clases semánticas (`.eyebrow`, `.h1`, `.display`, `.btn-pill`, `.surface-feature`, etc.).
- Layout vía `style={{...}}` inline o reglas en `globals.css`. Si nace un patrón recurrente, factorízalo a una clase semántica nueva en `globals.css` y documéntala en `docs/SISTEMA-DISENO.md`.

## 5. Recordatorios técnicos

- Esta versión de Next.js (16.2.6) tiene breaking changes vs. el training data del LLM. Antes de tocar APIs de Next.js, consultar `node_modules/next/dist/docs/`.
- Middleware se llama `proxy.ts` en la raíz (Next 16). No `middleware.ts`.
- Supabase: cliente browser con anon key, server con service role. Nunca exponer service role al cliente.
- AI Gateway: usar strings `"provider/model"` por defecto, no SDKs específicos del proveedor a no ser que se requiera explícitamente.
- En SVG **no animar `x`/`y` con motion**: duplica posiciones porque se aplica como transform además del atributo. Solo animar `opacity`. Ver `docs/SISTEMA-DISENO.md`.
