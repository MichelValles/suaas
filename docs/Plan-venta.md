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
| Starter | 30 $ | ~3M | Básicos (5s, copy, pricing) |
| Pro | 70 $ | ~7M | Todos |
| Agency | 200 $ | Sin límite diario | Todos + marca blanca |

## 4. Estimación de costes por instancia

### Infraestructura (coste marginal por cliente)

| Concepto | Coste/mes | Notas |
|---|---|---|
| Supabase (proyecto Micro en org Pro) | **10 $** | Mínimo en plan de pago: Micro (1 GB RAM, BD hasta 10 GB). Fórmula de la org: 15 + 10·N $/mes (plan Pro 25 $ con 10 $ de crédito de compute). Incluye backups diarios (retención 7 días) y sin pausa por inactividad. El free tier queda descartado: 2 proyectos máximo y pausa a la semana de inactividad. |
| Vercel (proyecto extra en team Pro) | **~2 $** | Proyectos ilimitados sin coste por proyecto; se paga uso. Coste dominante: memoria aprovisionada durante runs largos (~1,60 $/mes con 30 runs/día de 300 s en iad1). El crédito de 20 $/mes del team absorbe ~8-10 instancias antes de facturar. |
| **Total marginal por instancia** | **~10-12 $** | Más la base fija compartida: seat Vercel Pro (20 $/mes) y org Supabase Pro (25 $/mes). |

### Cómo escala: Vercel se comparte, Supabase no

La distinción que más afecta a la cuenta: de los tres costes, **solo el de Vercel es realmente plano para todas las instancias**. El de Supabase no lo es.

- **Vercel (~20 $ del seat)**: compartido, cubre todas las instancias. Cada app pequeña añade ~2 $ de compute, pero el crédito de 20 $/mes del team lo absorbe hasta ~10 instancias; a partir de ahí, +2 $ cada una. Límite técnico: 150 proyectos por repositorio (irrelevante a esta escala).
- **Supabase (25 $ de la org)**: cubre la organización **más una sola instancia** (vía el crédito de 10 $ de compute incluido). Cada cliente adicional es un proyecto Micro nuevo a **10 $/mes fijos**. No hay forma de meter varios clientes bajo unos 25 $ planos de Supabase: es el coste que escala de verdad.
- **API (30 $ por cliente)**: NO es coste de la agencia, es el consumo del cliente pagado contra el budget de *su* key. Si se refactura, es pass-through y no limita cuántas instancias se pueden tener.

Coste de infraestructura (lo que paga la agencia, sin la API del cliente):

| Instancias | Vercel | Supabase | **Infra/mes** | Por instancia |
|---|---|---|---|---|
| 1 | ~20 $ | 25 $ | **~45 $** | 45 $ |
| 3 | ~20 $ | 45 $ | **~65 $** | 22 $ |
| 5 | ~20 $ | 65 $ | **~85 $** | 17 $ |
| 10 | ~20 $ | 115 $ | **~135 $** | 13 $ |
| 15 | ~30 $ | 165 $ | **~195 $** | 13 $ |

Supabase sigue la fórmula `15 + 10·N $/mes` (org 25 $ + 10 $ por Micro − 10 $ de crédito del primero). El coste por instancia converge a ~12-13 $/mes de infra según crece N. **No hay un número máximo de instancias por límite de coste: es lineal.** Si se pone 25 $ Vercel + 25 $ Supabase como techo duro, entra 1 instancia completa; como base que escala, las que se quieran a ~12 $ de infra cada una más los 30 $ de API que paga el cliente. El margen por cliente es lo que se cobre por encima de esos ~12 $ (más los 30 $ de API si van incluidos en el plan).

Matiz de divisa: Vercel y Supabase facturan en dólares (20 $ y 25 $); sumar ~8-10 % de cambio EUR/USD y el IVA si aplica.

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

## 5. Precio de venta y plan comercial

### Principio: precio por valor, anclado al presupuesto de servicio

El coste marginal de una instancia es de ~12-42 €/mes (infra + API del cliente). **El precio NO se fija sobre ese coste.** Con producto propio y coste casi nulo, hay margen para fijar precio por el valor que percibe el cliente, que es lo que cuesta el research que sustituye:

- Un test de UX/CRO moderado real cuesta **4.000-10.000 €** y un estudio completo **3.000-25.000 €** (agencia: 15.000-75.000 €+).
- Cada participante real cuesta **100-500 €** «fully loaded» (incentivo + reclutamiento + tiempo de researcher), y reclutar se lleva **2-4 semanas** mientras las decisiones de diseño avanzan sin evidencia.
- SUAAS ataca exactamente esos tres costes: elimina el incentivo, el fee de reclutamiento y las semanas de espera, dejando el coste marginal en tokens.

El error a evitar es anclar al techo de «software puro» de una PYME española (100-1.000 €/mes). El ancla correcta es el **presupuesto de servicio de marketing/CRO** (1.500-5.000 €/mes), que es 3-5x mayor. Flat101 vende esto como agencia de CRO a clientes que YA pagan por research y optimización, no como «otra herramienta SaaS».

### Referencias de mercado (2026)

- **Usuarios sintéticos self-serve barato**: Delve AI ~0,99 $/usuario, Synthetic Users ~2-60 $/entrevista, round-table.ai 30-200 $/mes.
- **Usuarios sintéticos enterprise**: Yabble 8.900-80.000 $/año, Outset ~20.000 $/seat·año, Listen Labs ~20.000 $ + 300-400 $/sesión, Aaru/Evidenza seis cifras.
- **Testing UX/CRO tradicional**: UserTesting 12.000-100.000 $+/año, Maze 99 $/mes a 72.000 $/año, Lyssna 165 $/mes.
- **Servicios de CRO**: 1.500-31.000 $/mes; gasto medio en herramientas de CRO ~2.000 $/mes.

SUAAS se posiciona **muy por encima del software-ceiling y muy por debajo del enterprise**: el hueco mid-market self-serve para PYME y agencias, donde casi nadie ataca UX/CRO directamente (el competidor más alineado es Uxia, con free + custom).

### Estructura: setup + suscripción recurrente + oferta «land»

Modelo híbrido (tiers públicos + custom enterprise), que logra ~30% más de ACV y retiene mejor (churn recurrente 1,6 %/mes vs 4,2 % por proyecto):

- **Perfiles incluidos**: cada paquete incluye la generación de 50 perfiles calibrados según el target del proyecto. Es lo que hace el test fiel desde el primer día.
- **Calibración opcional** (one-time): un onboarding más profundo (cargar el VoC y las personas a medida del cliente). Opcional, no una barrera de entrada: ancla valor y sube el switching cost cuando el cliente la contrata.
- **Suscripción mensual por instancia dedicada**: el grueso del MRR. La instancia single-tenant (aislamiento de datos, marca del cliente) justifica de forma natural el escalón premium.
- **Oferta «land»**: un test puntual de bajo compromiso (una campaña o una auditoría 5s) que convierte a suscripción.

### Tiers recomendados (EUR, mercado España/EU)

Cada paquete incluye la generación de 50 perfiles calibrados al target y un presupuesto de IA (Starter 30 $, Pro 70 $, Agency 200 $/mes). La calibración profunda es un añadido opcional, no un setup obligatorio. El COGS es el peor caso (infra ~12 € + budget de API completo del tier en EUR); el margen es bruto.

| Tier | Precio/mes | Calibración opcional | Incluye | Cliente objetivo | COGS/mes | Margen |
|---|---|---|---|---|---|---|
| **Starter** | 290 € | 1.200 € | 50 perfiles calibrados, módulos básicos (5s, copy, pricing), API ~30 $/mes | PYME pequeña (<1 M facturación) | ~40 € | ~86 % |
| **Pro** (objetivo) | 790 € | 1.800 € | 50 perfiles calibrados, todos los módulos (campañas, GEO, Momentum), marca del cliente, API ~70 $/mes | PYME media / empresa mediana (1-5 M) | ~76 € | ~90 % |
| **Agency** | 1.900 € | 2.500 € | 50 perfiles calibrados, todo + sin límite diario, SLA y soporte prioritario, API ~200 $/mes | Empresa mediana grande (>5 M) | ~196 € | ~90 % |
| **Enterprise** | a medida (>2.900 €) | a medida | Multi-marca, integraciones, formación, varias instancias | Grandes cuentas / grupos | variable | alto |

- **Land (puntual)**: 490-790 € por un test único (una campaña o auditoría), descontable de la primera mensualidad si convierte.
- **Descuento anual**: 2 meses gratis (~17 %) en pago anual por adelantado. Mensual sin compromiso para el SMB (baja la barrera de entrada); anual para asegurar MRR y reducir churn.

El tier **Pro es el objetivo**: está dentro del presupuesto de servicio de una PYME media (donde el decisor aprueba sin comité si el ROI es claro), a ~50-60 % por debajo del ancla Agency, y cuesta menos que un único estudio real al trimestre.

### Argumento de venta (ROI)

«Un solo test de UX/CRO moderado cuesta 4.000-10.000 € y tarda 2-4 semanas solo en reclutar participantes. El tier Pro (790 €/mes) cuesta menos que un único estudio al trimestre y entrega resultados en minutos. Si evita una sola iteración de diseño equivocada o sube la conversión un 1 %, el retorno es inmediato.» Enmarcar el precio como inversión con retorno, no como gasto, y reforzar que cada tier desbloquea 2-3x el valor del anterior.

### Honestidad metodológica (protege la reputación de Flat101)

El patrón 2026 es **sintético para el 80 % inicial** (iteración rápida, message testing, descartar conceptos, generar hipótesis) y reservar el research humano caro para el **20 % final** (decisión go/no-go, insight emocional, edge cases). Vender SUAAS como complemento que acelera y abarata el grueso del research, no como sustituto total, es lo que hacen los players serios (Synthetic Users, Outset) y lo que sostiene la credibilidad de una agencia de CRO. La base teórica de fidelidad está en `CONOCIMIENTO-USUARIOS-SINTETICOS.md`.

### Por qué funciona el margen

Con producto propio y coste marginal casi nulo, el budget de la API key es el corte duro que protege el margen: un cliente nunca puede consumir más que su plan (el gateway corta con un 429). El COGS por instancia no supera nunca infra + budget del tier, así que los márgenes del 93-95 % de la tabla son reales, no optimistas. La palanca de crecimiento es la **expansión** (subir de tier al crecer el uso, módulos premium), no competir por precio: la especialización vertical de Flat101 en CRO/UX permite primas del 35-40 % sobre un reseller genérico.

### Landing comercial (`/propuesta`)

Existe una landing de venta en la ruta `/propuesta`, **pública** (se comparte con clientes; en `PUBLIC_PATHS` de `proxy.ts`). Marca comercial **Gravity** (constante `BRAND` en `app/propuesta/page.tsx`, editable); el copy usa «perfiles calibrados», no «usuarios sintéticos». Usa el **Gravity Model como metodología comercial** con la animación orbital de los tres planos, menú de anclas sticky y estilo visual afín a flat101.es (datos grandes en amarillo, CTAs con flecha, alto contraste). Incluye el pitch, los paquetes, el **módulo de coste de IA** (tabla comparativa de Anthropic, OpenAI, Gemini y Perplexity con coste por run y runs por presupuesto) y una **calculadora de tarificador y rentabilidad** (`app/propuesta/calculator.tsx`).

La calculadora muestra a cualquiera sólo la tarifa. La **vista interna** (rentabilidad bruta y neta) se desbloquea con la contraseña `michel101` (override `LANDING_PASSWORD` en Vercel) vía el login del footer: `lib/landing-auth.ts` + `POST /api/propuesta/access` (cookie httpOnly). Es un gate de presentación: como la calculadora corre en el navegador, los números base están en el bundle; para confidencialidad total de los márgenes habría que mover el cálculo a servidor. Si se quiere una URL más limpia para compartir, se puede apuntar el subdominio `landing.suaas.flat101.business` a esta ruta desde el dashboard de Vercel (paso manual de dominio/DNS).

## 6. Plan de mantenimiento

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

## 7. Cuándo saltar a multi-tenant

Reevaluar la opción B cuando se cumpla alguna: más de 5-8 clientes activos, necesidad de alta self-service (registro sin intervención), o el coste de Supabase por instancia (10 $ × N) supere el coste del refactor. Los feature flags por env del punto 3 migran tal cual a una tabla `plans`.

## Fuentes (verificadas 2026-06-11)

Infraestructura:
- supabase.com/pricing y docs de billing/compute (org Pro 25 $, Micro 0,01344 $/h ≈ 10 $/mes, ejemplo oficial: org con 2 Micro = 35 $/mes).
- vercel.com/pricing y docs de functions/usage, domains y AI Gateway (Pro 20 $/seat con 20 $ de crédito, Active CPU 0,128 $/h y memoria 0,0106 $/GB·h en iad1, wildcard en Pro, Custom Reporting por api_key_name).

Precios de mercado y estrategia (investigación multiagente 2026-06-11):
- Usuarios sintéticos: syntheticusers.com, yabble.com/pricing, outset.ai/pricing, listenlabs.ai, delve.ai, aaru.com, uxia.app.
- Testing UX/CRO tradicional y coste de research: usertesting.com/plans, maze.co/pricing, lyssna.com/pricing, userinterviews.com/pricing, respondent.io/pricing, cleverx.com (coste de research por método 2026), nngroup.com.
- Estrategia de pricing y mercado España/EU: almcorp.com (white-label), getmonetizely.com (value-based, anclaje, 3 tiers), vwo.com (pricing CRO), laayudadigital.com y cajasiete.com (presupuestos PYME España).
