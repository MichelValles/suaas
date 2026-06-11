# Plan de venta · Instancias de SUAAS para clientes

> Análisis de viabilidad, costes y operación para ofrecer SUAAS a clientes como instancias dedicadas.
> Precios de infraestructura verificados contra las tarifas vigentes de Supabase y Vercel el 2026-06-11.
> Consumo LLM modelado con las medias reales de `gateway_usage` y las fórmulas por runner de `lib/estimate.ts` (v0.50.0).

## 1. Decisión de arquitectura

Dos caminos posibles:

- **A) Una instancia por cliente (replicar SUAAS)**: un proyecto de Vercel + un proyecto de Supabase + una API key del AI Gateway por cliente, todos desplegando desde el mismo repo.
- **B) Multi-tenant real (una sola instancia)**: cuentas de usuario, columna `org_id` en todas las tablas, RLS por organización, presupuestos y planes por tenant en base de datos.

**Decisión recomendada: empezar por A.** SUAAS es single-tenant hasta la médula (contraseña global, un Supabase con service role, RLS deny-all que el server salta, ninguna tabla con concepto de organización). La opción B es un cambio estructural (versión 1.0.0): migración con `org_id` en ~12 tablas, reescritura de todos los CRUD de `lib/`, Supabase Auth, proxy y gates de presupuesto por tenant. Solo compensa con más de 5-8 clientes o si se quiere alta self-service.

La opción A es casi cero código y da lo que más importa con clientes: **aislamiento total de datos** (cada cliente su Supabase), **techo de gasto por cliente** (budget de su API key) y off-boarding trivial (borrar el proyecto). Encaja con la infraestructura ya construida: el budget por API key con refresh mensual ES el límite de plan, el dashboard del AI Gateway da el gasto por key (= por cliente) sin instrumentar nada, y la página `/tokens` más los costes en los botones (v0.50.0) enseñan a cada cliente lo que consume.

**Descartado**: un único Supabase con esquemas separados por cliente. Ahorra 10 $/mes por cliente pero obliga a tocar todo `lib/supabase.ts` y debilita el aislamiento: el peor intercambio posible.

## 2. Prerrequisitos antes del primer cliente

1. **Git integration en Vercel** y un proyecto por cliente apuntando a `main`: un push despliega todas las instancias (hoy el deploy es manual con `vercel --prod`). Límite holgado: 150 proyectos por repositorio en el plan Pro.
2. **Automatizar las migraciones** (el verdadero cuello de botella: hoy se aplican a mano en el SQL editor). Script que recorra las `POSTGRES_URL` de cada instancia y aplique lo pendiente; la base ya existe (`scripts/apply-migration.mjs` + tracking en `suaas_migrations` y `/diag`).
3. **Una API key del gateway por cliente** con budget mensual (nunca con refresh `none`: lección del incidente de la cuota del 2026-06-11).
4. **Env vars por instancia**: `ACCESS_PASSWORD` y `SEED_PASSWORD` propios, `AI_GATEWAY_API_KEY` propia, `SUAAS_DAILY_TOKEN_BUDGET` según plan, y las de Supabase de su proyecto.
5. **Sprint de seguridad pendiente** (`AUDITORIA-SEGURIDAD.md`): A-01 (cookie de sesión con valor constante, eludible), VULN-05 (sin rate limit en `/api/auth`: contraseña brute-forceable) y A-02. Riesgo aceptado con un operador interno; inaceptable con clientes.
6. **Checklist de aprovisionamiento** (idealmente script): crear proyecto Supabase → aplicar las migraciones → crear proyecto Vercel → envs → key del gateway con budget → dominio. A mano son 30-45 minutos por cliente; scriptado, 5-10.
7. **Dominio**: wildcard `*.suaas.flat101.business` en Vercel Pro (sin coste, pero exige verificar el dominio con los nameservers de Vercel, no vale CNAME).

## 3. Planes

En el modelo de instancias, un plan no es código: es **una combinación de configuración por instancia**.

| Palanca | ¿Existe ya? | Cómo se ajusta por plan |
|---|---|---|
| Tope de gasto mensual en $ | Sí | Budget de la API key del gateway (refresh `monthly`) |
| Tope diario de tokens | Sí | `SUAAS_DAILY_TOKEN_BUDGET` |
| Módulos habilitados (5s, campañas, GEO...) | No | Env var nueva tipo `SUAAS_ENABLED_MODULES` (ocultar rutas y pestañas del sidebar) |
| Máximo de perfiles / perfiles por run | Parcial (20 por run) | Env var nueva `SUAAS_MAX_PROFILES` |
| Marca blanca (nombre, logo del cliente) | No | Env vars de branding |

Las únicas piezas a programar son los feature flags de módulos y el cap de perfiles por env: cambio pequeño y reutilizable si algún día se migra a multi-tenant (los flags pasarían de env a una tabla `plans`).

Tiers sugeridos (el budget de la key es el corte duro: el cliente nunca gasta más que su plan):

| Tier | Budget key/mes | Tokens/día | Módulos |
|---|---|---|---|
| Starter | 10 $ | ~1,5M | Básicos (5s, copy, pricing) |
| Pro | 30 $ | ~4M | Todos |
| Agency | 100 $ | Sin límite diario | Todos + marca blanca |

## 4. Estimación de costes por instancia

### Infraestructura (coste marginal por cliente)

| Concepto | Coste/mes | Notas |
|---|---|---|
| Supabase (proyecto Micro en org Pro) | **10 $** | Mínimo en plan de pago: Micro (1 GB RAM, BD hasta 10 GB). Fórmula de la org: 15 + 10·N $/mes (plan Pro 25 $ con 10 $ de crédito de compute). Incluye backups diarios (retención 7 días) y sin pausa por inactividad. El free tier queda descartado: 2 proyectos máximo y pausa a la semana de inactividad. |
| Vercel (proyecto extra en team Pro) | **~2 $** | Proyectos ilimitados sin coste por proyecto; se paga uso. Coste dominante: memoria aprovisionada durante runs largos (~1,60 $/mes con 30 runs/día de 300 s en iad1). El crédito de 20 $/mes del team absorbe ~8-10 instancias antes de facturar. |
| **Total marginal por instancia** | **~10-12 $** | Más la base fija compartida: seat Vercel Pro (20 $/mes) y org Supabase Pro (25 $/mes). |

### Consumo LLM (lo que pasa por la API key del cliente)

Costes unitarios con el runner actual (todo Sonnet, imágenes a 1024px, v0.49+): combinación de campaña ~0,03 $; test 5s ~0,015 $/perfil; mensaje de chat ~0,025 $ (el reasoner va en Opus); perfil sembrado ~0,02 $; run de campaña a tope (200 combos) ~5-6 $.

| Escenario | Uso típico mensual | LLM/mes | **Total/mes (infra + LLM)** |
|---|---|---|---|
| Ligero | 10 runs pequeños, 2 campañas medianas, ~50 mensajes de chat | 3-5 $ | **~13-17 $** |
| Medio | 30 runs variados, campañas semanales con 1 grande, ~200 mensajes | 15-25 $ | **~25-37 $** |
| Intensivo | Campañas a tope semanales, iteración diaria, ~500 mensajes | 45-80 $ | **~55-92 $** |

Coste único de alta: 30-45 minutos a mano; 5-10 minutos scriptado.

### Refacturación por cliente

El gasto exacto por cliente sale del dashboard del AI Gateway (gasto por API key) o de la **Custom Reporting API** (`GET https://ai-gateway.vercel.sh/v1/report` con `group_by=api_key_name`; queries a 5 $/1.000): una key por cliente y no hay nada que instrumentar.

### Avisos

- **Región UE**: Supabase cuesta lo mismo en región europea; el compute de Vercel en `fra1` sube ~45% (seguiría siendo ~3 $/mes por instancia). Valorarlo si el cliente exige datos en la UE.
- **RPO**: los backups de Supabase Pro son diarios con 7 días de retención (RPO 24 h). Declararlo en el contrato. PITR es un add-on caro (~100 $/mes por proyecto) que no compensa a este tamaño.

## 5. Plan de mantenimiento

### Por release (cada cambio)

1. Si lleva SQL: ejecutar el script de migraciones multi-instancia ANTES del deploy (`suaas_migrations` y `/diag` dicen quién va atrasado).
2. Push a `main` → con git integration, Vercel despliega los N proyectos.
3. Verificación: versión en la consola de una instancia canaria + `/diag` verde. Regresión: `vercel rollback` por proyecto.

### Semanal (~30 min)

- Dashboard AI Gateway → gasto por key: avisar a clientes cerca de su budget antes de que les corte el 429.
- Barrido de runs en `error` y logs 5xx en Vercel.
- Saldo de créditos del gateway del team (activar auto top-up).

### Mensual (~2-3 h)

- Informe de consumo por cliente y ajuste de budgets.
- `npm audit` y parches menores de dependencias.
- Revisión de Supabase por proyecto: tamaño de BD, backups ejecutándose.

### Trimestral (~media jornada)

- Rotación de `ACCESS_PASSWORD`/`SEED_PASSWORD` por instancia.
- Actualización de Next.js / AI SDK probada primero en deploy preview.
- Simulacro de restore de un backup.
- Repaso de la auditoría de seguridad.

### Runbook de incidencias

| Incidencia | Acción |
|---|---|
| Cliente con 429 de presupuesto | Su budget de key se agotó: subirlo o esperar al reset mensual. Con `SUAAS_DAILY_TOKEN_BUDGET` el mensaje ya es de negocio. |
| Migración pendiente en una instancia | `/diag` lo marca; correr el script contra esa instancia. |
| Caída de Supabase/Vercel | Status pages. Las instancias son independientes: el blast radius es por cliente. |

### Dedicación estimada

~2-4 h/mes de base (releases + revisiones) más ~0,5-1 h/mes por instancia. Con 5 clientes: 5-8 h/mes una vez scriptados aprovisionamiento y migraciones. Onboarding de cliente nuevo: 1-2 h a mano, 15-30 min scriptado.

## 6. Cuándo saltar a multi-tenant

Reevaluar la opción B cuando se cumpla alguna: más de 5-8 clientes activos, necesidad de alta self-service (registro sin intervención), o el coste de Supabase por instancia (10 $ × N) supere el coste del refactor. Los feature flags por env del punto 3 migran tal cual a una tabla `plans`.

## Fuentes de precios (verificadas 2026-06-11)

- supabase.com/pricing y docs de billing/compute (org Pro 25 $, Micro 0,01344 $/h ≈ 10 $/mes, ejemplo oficial: org con 2 Micro = 35 $/mes).
- vercel.com/pricing y docs de functions/usage, domains y AI Gateway (Pro 20 $/seat con 20 $ de crédito, Active CPU 0,128 $/h y memoria 0,0106 $/GB·h en iad1, wildcard en Pro, Custom Reporting por api_key_name).
