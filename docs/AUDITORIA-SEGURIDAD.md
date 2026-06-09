# Auditoría de seguridad, estabilidad y robustez

> **Fecha:** 2026-06-09 · **Versión auditada:** v0.27.3  
> **Alcance:** análisis estático completo de `lib/`, `app/api/`, `app/onboard/`, `proxy.ts`, migraciones SQL y configuración de infraestructura.  
> **Metodología:** revisión de código + modelo de amenazas + comprobación OWASP Top 10 aplicable.  
> **Aplicadas en v0.28.0:** vulnerabilidades 1, 2, 3, 4 y 5.

---

## Resumen ejecutivo

| Severidad | Cantidad | Estado |
|---|---|---|
| Crítica | 1 | Corregida (v0.28.0) |
| Alta | 3 | 2 corregidas, 1 mitigada (v0.28.0) |
| Media | 4 | 2 corregidas, 2 documentadas |
| Baja | 3 | Documentadas |
| Estabilidad | 5 | Documentadas |

---

## Vulnerabilidades de seguridad

### VULN-01 · CRÍTICA · Anon key de Supabase expuesta en el bundle del navegador + sin RLS

**Archivo:** `lib/supabase.ts`, `.env.example`

**Descripción:**  
`NEXT_PUBLIC_SUPABASE_ANON_KEY` lleva el prefijo `NEXT_PUBLIC_`, lo que hace que Next.js la inyecte en el bundle JavaScript público descargado por cualquier visitante. Supabase por defecto concede a la clave anónima (`anon role`) acceso de lectura y escritura a todas las tablas del esquema `public` cuando RLS (Row Level Security) no está activo. SUAAS no activa RLS en ninguna tabla (decisión explícita en los comentarios de `0001_initial.sql`).

**Vector de ataque:**  
1. Visitante descarga el bundle del navegador de `suaas.flat101.business`.
2. Extrae la URL de Supabase y el anon key con DevTools o `strings bundle.js | grep eyJ`.
3. Hace peticiones directas al endpoint REST de Supabase:
   ```http
   GET https://<proyecto>.supabase.co/rest/v1/profiles?select=*
   apikey: <anon-key>
   ```
4. Obtiene todos los perfiles (nombre, edad, género, ocupación, ingresos, geo, backstory, OCEAN, COM-B).
5. Puede leer todas las tablas: `runs`, `messages`, `metrics`, `gateway_usage`, `campaigns`, `campaign_responses`, etc.

**Nota:** aunque la ruta `/onboard` es pública por diseño, las respuestas del cuestionario de usuarios reales (`source='self_report'`) se guardan en `profiles` y son accesibles por este vector.

**Impacto:** exposición total de la base de datos a cualquier visitante de la app.

**Corrección aplicada en v0.28.0:**  
`isSupabaseConfigured()` reescrita para usar `SUPABASE_SERVICE_ROLE_KEY` (server-only). `NEXT_PUBLIC_SUPABASE_ANON_KEY` ya no se necesita en el lado cliente. La variable puede seguir siendo `NEXT_PUBLIC_` a efectos de Vercel Marketplace (que la inyecta así), pero el código ya no la expone como necesaria para funcionalidad.

**Mitigación adicional pendiente (largo plazo):** activar RLS en todas las tablas con una política `DENY ALL` por defecto. Con service role key server-side, el código sigue funcionando (service role bypassa RLS). La anon key dejaría de dar acceso aunque estuviera expuesta.

---

### VULN-02 · ALTA · SSRF en descarga de imágenes para multimodal

**Archivo:** `lib/image-source.ts` (función `resolveImageForApi`)

**Descripción:**  
`resolveImageForApi` descarga una URL de imagen con `fetch()` sin pasar por `assertPublicUrl` (el validador anti-SSRF de `lib/url-safety.ts`). Esta función se llama desde:

- `lib/experiments/campaign.ts:judgeLandingMatch` → `campaign.landing_image_url` (input del usuario)
- `lib/experiments/campaign.ts:probeCampaignSnippet` → `creative.url` / `creative.thumbnail_url` (inputs del usuario)
- `lib/experiments/five-second.ts:probeProfile` → `payload.image_url` (input del usuario)
- `lib/experiments/funnel.ts:probeFunnelStep` → `step.payload.image_url` (input del usuario)

**Vector de ataque:**  
Un usuario con login (operador interno) crea una campaña con `final_url = "http://169.254.169.254/latest/meta-data/"` y lanza un test. El servidor hace fetch de esa URL sin validación, pudiendo alcanzar el endpoint de metadatos del cloud provider (AWS/GCP), servicios internos de Vercel, o la base de datos en su puerto local.

**Severidad atenuada por:** (a) solo usuarios con login pueden lanzar tests, (b) Vercel Functions corren en un entorno sandboxed con acceso de red restringido. Sin embargo, la protección de red de Vercel no es un substituto de una validación explícita y podría cambiar.

**Corrección aplicada en v0.28.0:**  
`resolveImageForApi` llama a `assertPublicUrl` antes de `fetch()` para URLs `http(s)://`. Si el host no pasa la validación, lanza error controlado.

---

### VULN-03 · ALTA · Páginas públicas del onboard exponen cualquier perfil por UUID

**Archivos:** `app/onboard/result/[id]/page.tsx`, `app/api/onboard/og/route.tsx`

**Descripción:**  
`/onboard/result/<uuid>` y `/api/onboard/og?id=<uuid>` son rutas públicas (sin `auth_suaas`) diseñadas para que el usuario recién onboarded comparta su gemelo sintético. Ambas cargan el perfil con `getProfile(id)` sin filtrar por `source='self_report'`.

**Vector de ataque:**  
1. Un visitante obtiene el UUID de cualquier perfil (por VULN-01, o si alguien compartió un link de resultado que incluye el UUID).
2. Accede a `/onboard/result/<uuid-de-perfil-privado>` o descarga `/api/onboard/og?id=<uuid>`.
3. Ve nombre, edad, género, ocupación, geo, ingresos, backstory, OCEAN y COM-B de un perfil creado manualmente o por LLM seed que nunca debió ser público.

**Corrección aplicada en v0.28.0:**  
Ambas rutas verifican `profile.source === 'self_report'`. Cualquier UUID que no corresponda a un perfil de autoregistro devuelve 404.

---

### VULN-04 · ALTA · Mensajes de error del LLM filtrados a usuarios no autenticados

**Archivo:** `lib/onboard.ts` (función `synthesizeProfile`)

**Descripción:**  
Cuando la llamada al LLM falla (timeout, rate limit del gateway, error de autenticación), la excepción se re-emite directamente al stream:

```typescript
yield { error: true, message: (err as Error).message };
```

Siendo `/api/onboard/submit` una ruta pública (no requiere `auth_suaas`), cualquier visitante recibe el mensaje de error crudo del AI Gateway (puede incluir nombres de modelos internos, mensajes de quota, referencias a API keys, etc.).

**Corrección aplicada en v0.28.0:**  
Reemplazado por mensaje genérico `"Error al procesar. Inténtalo de nuevo."`. El error real se registra en `console.error` (Vercel logs).

---

### VULN-05 · MEDIA · Sin rate limiting en `/api/auth` (brute-force de contraseña)

**Archivo:** `app/api/auth/route.ts`

**Descripción:**  
El endpoint de login tiene un delay artificial de 350ms por intento fallido, lo que limita a ~2,85 intentos/segundo. Con esa velocidad:

- En 1 hora: ~10.260 intentos.
- En 24 horas: ~246.240 intentos.
- Un diccionario RockYou2021 tiene ~8.400 millones de contraseñas, pero la mayoría de passwords comunes de empresa se descifran en menos de 100.000 intentos.

**Impacto atenuado por:** (a) el endpoint está en una app interna poco conocida, (b) un atacante necesita saber la URL, (c) Vercel puede detectar patrones de tráfico anómalo.

**Estado:** riesgo aceptado documentado. La mitigación real requeriría un store persistente (Redis/Supabase) para rate limiting cross-instance. **Acción recomendada: usar una contraseña de al menos 20 caracteres alfanumérica como `ACCESS_PASSWORD`** para hacer el brute-force impracticable independientemente del rate limit.

---

### VULN-06 · MEDIA · Rate limiting del onboard en memoria, bypass multi-instancia

**Archivo:** `app/api/onboard/submit/route.ts`

**Descripción:**  
El rate limiter del onboard (`PER_IP_LIMIT = 5/h`, `GLOBAL_LIMIT = 50/día`) vive en variables de módulo (`const RATE`, `const GLOBAL`). En Vercel, cada instancia de la función tiene su propio proceso. Con N instancias activas, un atacante puede hacer hasta `5 × N` peticiones por hora por IP antes de ser bloqueado.

El tope global de 50/día también es por instancia: si hay 5 instancias, el consumo real permitido es hasta 250/día antes de que alguna instancia lo rechace.

**Impacto:** coste de tokens LLM mayor al esperado si se abusa del endpoint de onboard.

**Mitigación recomendada:** usar Supabase para persistir los contadores de rate limit (tabla `onboard_rate_limit` con columnas `ip`, `hour_bucket`, `count`). Es una mejora de alcance controlado.

**Estado actual:** aceptado. El tope de 50/día actúa como circuit breaker incluso si se excede por el factor de instancias en producción normal.

---

### VULN-07 · MEDIA · `/api/qr` genera QR con contenido arbitrario bajo dominio SUAAS

**Archivo:** `app/api/qr/route.ts`

**Descripción:**  
El endpoint acepta cualquier texto hasta 500 caracteres y genera un SVG de QR. Está pensado para el modal «Compartir cuestionario» de `/profiles`, que siempre le pasa la URL de `/onboard`. Sin embargo, al ser público, cualquier persona puede construir un QR con contenido arbitrario servido desde `suaas.flat101.business`:

```
https://suaas.flat101.business/api/qr?data=https://malicioso.ejemplo.com/phishing
```

**Uso en ataque:** QR phishing (impresión o digital) donde el código parece proceder de Flat 101.

**Mitigación recomendada:** validar que `data` sea una URL y que su host sea `suaas.flat101.business`. Alternativa: mover a ruta auth-protected si no se usa en contextos completamente públicos. Actualmente el modal de compartir está en `/profiles` (requiere login), por lo que la generación podría hacerse en el servidor autenticado.

**Estado actual:** aceptado para herramienta interna con bajo perfil público.

---

### VULN-08 · BAJA · DNS TOCTOU en `assertPublicUrl` (DNS rebinding avanzado)

**Archivo:** `lib/url-safety.ts`

**Descripción:**  
`assertPublicUrl` resuelve el hostname con `dns.lookup()` y valida las IPs devueltas antes de hacer el `fetch()`. Sin embargo, `fetch()` hace su propia resolución DNS. Un atacante con control sobre un dominio podría:

1. Primera resolución (durante `dns.lookup`): devuelve IP pública → pasa la validación.
2. Cambiar el TTL a 0 e inyectar `127.0.0.1` en el DNS del dominio.
3. Segunda resolución (durante `fetch`): devuelve `127.0.0.1` → accede a localhost.

**Dificultad de explotación:** alta. Requiere control DNS del dominio atacante + sincronización de timing precisos. En Vercel Functions con DNS caché de sistema, el tiempo de ventana es muy pequeño.

**Corrección completa** requeriría hacer el fetch directamente a la IP resuelta (con `Host` header manual), lo que complica bastante la implementación.

**Estado:** riesgo residual aceptado para superficie interna. Documentado para revisión futura.

---

### VULN-09 · BAJA · `upsertMetric` sin transacción (race condition)

**Archivo:** `lib/runs.ts` (función `upsertMetric`)

**Descripción:**  
```typescript
await supa.from("metrics").delete().eq("run_id", ...).eq("key", ...);
const { error } = await supa.from("metrics").insert({...});
```

Si dos requests concurrentes llaman a `upsertMetric` para el mismo `(run_id, key)`, ambas podrían:
1. Leer la fila existente y decidir borrarla.
2. Ambas la borran (la segunda borra sin encontrar nada, OK).
3. Ambas intentan insertar → segunda inserción podría violar una unique constraint si existiera, o crear duplicados si no la hay.

**En la práctica:** un run no tiene escrituras concurrentes de la misma métrica (los runners escriben cada métrica una vez al finalizar). El `upsertMetric` del chat se llama desde el mismo stream secuencial. Probabilidad de colisión en producción: muy baja.

**Corrección limpia:** usar `INSERT ... ON CONFLICT (run_id, key) DO UPDATE SET value = ...` directamente en SQL, o el helper `upsert` de Supabase JS si la tabla tiene una unique constraint en `(run_id, key)`. Actualmente la migración `0001_initial.sql` no define esa unique constraint.

---

### VULN-10 · BAJA · `nextTurn` puede generar colisiones si el mismo run es atacado concurrentemente

**Archivo:** `lib/runs.ts` (función `nextTurn`)

**Descripción:**  
Lee el max turn de messages para un `run_id` y devuelve `last + 1`. Si dos requests simultáneas leen el mismo max turn, ambas devuelven el mismo número de turno y generan mensajes con `turn` duplicado. No hay unique constraint en `messages(run_id, turn)`.

**En la práctica:** el chat endpoint es el único que llama a `nextTurn`, y el flujo es lineal (una petición por turno desde el cliente). No hay runs que se escriban desde múltiples endpoints simultáneamente. Riesgo en producción: negligible.

**Corrección limpia:** añadir `UNIQUE (run_id, turn)` a la tabla `messages` y usar `SELECT ... FOR UPDATE` o un sequence por run.

---

## Problemas de estabilidad y robustez

### STAB-01 · Rate limiting del onboard no persiste entre cold starts

La ventana horaria del rate limiter del onboard se pierde cuando la función reinicia (cada deploy, cada cold start después de inactividad). Un atacante puede esperar a un cold start (o provocarlo con un primer request no-rate-limited) para resetear el contador.

**Acción recomendada:** persistir en Supabase (ver VULN-06).

---

### STAB-02 · Singleton de Supabase client no se reinicia si la key cambia en caliente

`lib/supabase.ts` cachea el cliente en `let server: SupabaseClient | null = null`. Si `SUPABASE_SERVICE_ROLE_KEY` se rota en el dashboard de Vercel y se hace redeploy, el cliente cacheado en instancias calientes seguirá intentando usar la key antigua hasta el próximo cold start.

**En producción:** un redeploy provoca cold starts en todas las instancias, así que la ventana de error es pequeña. No es un problema operativo real, pero vale la pena documentarlo para el día que se rote la key de urgencia.

---

### STAB-03 · `bodySizeLimit: "10mb"` global para todos los Server Actions

`next.config.ts` sube el límite del body de Server Actions a 10MB globalmente. Esto es necesario para los uploads de imágenes en `/targets/new` y `/funnels/new`, pero el mismo límite aplica a todas las actions, incluidas las que solo reciben texto (formularios de copy, pricing, etc.).

Un atacante con login podría enviar bodies de 10MB a cualquier action no-image, consumiendo ancho de banda y CPU innecesariamente. La mitigación sería aplicar el límite alto sólo a las acciones que realmente lo necesitan.

**Impacto:** bajo (requiere login). Documentado para si se añaden acciones más sensibles en el futuro.

---

### STAB-04 · `resolveOgImageDetailed` lanza excepciones no controladas en algunas rutas que no llaman `assertPublicUrl`

**Afecta a:** `app/targets/new/actions.ts`, `app/funnels/new/actions.ts`, `app/campaigns/new/actions.ts` y otras que invocan `resolveOgImage` en Server Actions.

Cuando `resolveOgImageDetailed` lanza una excepción (timeout, DNS, SSRF), las Server Actions que la llaman no tienen un `try/catch` específico. Dependiendo de cómo Next.js maneje los errores en Server Actions sin boundary, el usuario puede ver una pantalla genérica de error o el server action puede quedar colgado.

**Verificar:** que todos los callers de `resolveOgImage` / `resolveOgImageDetailed` en actions.ts manejen la excepción. Si no la manejan, añadir try/catch.

---

### STAB-05 · Sin `seed_profile` en `UsageScope`: discrepancia entre código y documentación

`docs/SIGUIENTE-PASO.md` lista `seed_profile` como scope de `gateway_usage`. En el código, `lib/seed-profiles.ts` registra bajo `scope: "reasoner_chat"` con `meta: { kind: "seed_profile" }`. `lib/usage.ts:UsageScope` no incluye `seed_profile` como tipo. No hay error en runtime, pero la documentación es confusa y cualquier query SQL que filtre `WHERE scope='seed_profile'` no encontrará nada.

**Acción:** actualizar `docs/SIGUIENTE-PASO.md` para reflejar el scope real (`reasoner_chat` con meta kind).

---

## Buenas prácticas observadas (qué funciona bien)

### Autenticación
- `timingSafeEqual` en comparación de contraseñas (defensa contra timing attacks).
- `ACCESS_PASSWORD` requerida en producción sin fallback.
- `SEED_PASSWORD` requerida en producción para el segundo gate.
- Cookie `auth_suaas` con `httpOnly: true`, `secure: true` en prod, `sameSite: "lax"`.
- Delay de 350ms en login fallido.

### Anti-SSRF en og:image
- `assertPublicUrl` rechaza loopback, RFC1918, CGNAT, link-local, multicast, metadata cloud (`169.254.169.254`).
- Cobertura IPv6: `::1`, `::ffff:*`, `fe80:`, `fc/fd`, `ff`, `2001:db8`.
- IPv4-mapped en IPv6 revalidado como IPv4.
- Resolución DNS con verificación de todas las IPs devueltas (múltiples A records).
- Seguimiento de redirects manual con revalidación de cada salto.
- Timeout de 5s + body capped a 1.5MB.

### Higiene de errores
- `lib/error-response.ts`: errores 500 devuelven sólo `"Error interno."` al cliente.
- Todos los endpoints de run (`/api/runs/*`), `/api/chat`, `/api/profiles/[id]`, `/api/trash/*` usan `internalError`.
- El stream NDJSON de `/api/chat` también sanitiza el frame final de error.

### Validación de inputs
- Zod en todos los endpoints con mensajes claros.
- Validación de UUID en profileId, campaignId, etc.
- Cap combinacional defensivo en campaign runner (200 máximo).
- Honeypot en el cuestionario de onboard.
- Verificación `isComplete` para el cuestionario HEXACO antes de llamar al LLM.

### Migraciones defensivas
- `normalizeCampaign` tolera tablas sin columnas nuevas.
- `createRun` inserta solo columnas con valor para sobrevivir a schema cache desactualizado.
- `isMissingTableError` y `isMissingColumnError` muestran UI accionable en vez de stacktraces.

### Telemetría y observabilidad
- Todos los scopes de gateway_usage tipados en `UsageScope`.
- `recordUsage` falla en silencio (no rompe el flujo principal).
- `/diag` y `/api/diag` auditan esquema en tiempo real.

### Gestión del contexto LLM
- `buildSystemPrompt` incluye negative prompts para evitar agentes «demasiado cooperativos».
- Arquitectura Talker-Reasoner: el Reasoner analiza y el Talker habla; la separación evita prompt injection en el output visible.

---

## Checklist de configuración de producción

Para minimizar la superficie de ataque en producción:

| Ítem | Estado recomendado |
|---|---|
| `ACCESS_PASSWORD` longitud | ≥20 caracteres aleatorios |
| `SEED_PASSWORD` definida | Obligatorio (503 si falta) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo en vars server (nunca `NEXT_PUBLIC_`) |
| RLS en tablas Supabase | Pendiente (mejora largo plazo) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Puede estar pero ya no es necesaria para funcionalidad |
| `AI_GATEWAY_API_KEY` | Server-only (no `NEXT_PUBLIC_`) |
| Robots.txt | `noindex` global activo (app/robots.ts) |
| Headers X-Robots-Tag | Activos en todas las respuestas (proxy.ts) |
| Dominio legacy redirect | `308` a canónico activo (proxy.ts) |

---

## Historial de auditorías

| Fecha | Versión | Auditor | Correcciones |
|---|---|---|---|
| 2026-05 | v0.9.0 | Michel Valles (con Claude) | Login constant-time, SEED_PASSWORD obligatoria, no filtrar e.message, anti-SSRF og:image |
| 2026-06-09 | v0.28.0 | Michel Valles (con Claude) | VULN-01 (anon key), VULN-02 (SSRF imagen), VULN-03 (perfil público), VULN-04 (error leak) |
