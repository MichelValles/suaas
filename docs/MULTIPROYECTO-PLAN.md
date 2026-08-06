# Plan multiproyecto · proyectos, identidad, coste y arquetipos

> Documento de trabajo del programa que convierte Gravity de instancia única con contraseña compartida en una plataforma **multiproyecto con clientes dentro de la misma instancia**.
> Estado: **aprobado, sin arrancar**. Diagnóstico verificado contra producción y base de datos el **2026-08-06**, sobre `v0.79.2`.
> Techo de versión del programa: **v0.90.0**. No se sube a 1.0.0.

## 1. Qué decide este documento

Gravity pasa a trabajar **por proyectos**. Un proyecto es un cliente (IVI, SegurCaixa Adeslas Dental, O2 Spain) más un proyecto propio para el trabajo interno de Flat 101. Todo lo que hoy cuelga de la nada pasa a colgar de un proyecto: perfiles, marcas de Cerebro, campañas, tests, análisis y runs.

Sobre ese ámbito se monta lo demás:

1. **Ámbito por proyecto**: no se puede lanzar un run de IVI con perfiles de Adeslas.
2. **Identidad, roles y aislamiento garantizado**: quien tiene acceso a IVI no puede ver Adeslas, ni por error ni forzando la URL.
3. **Coste y presupuesto por proyecto**: cada cliente consume contra su propio presupuesto y es refacturable.
4. **Arquetipos con cuotas**: los perfiles de un proyecto se agrupan en arquetipos con un peso declarado, y los runs se lanzan sobre muestras representativas en lugar de sobre una selección a dedo.

### Qué deroga

**`Plan-venta.md §1` queda derogado por este documento.** Aquel análisis eligió la opción A (una instancia por cliente: su Vercel, su Supabase, su API key) y descartó la opción B (multi-tenant real) hasta tener entre 5 y 8 clientes. La decisión de negocio ha cambiado: **los clientes entrarán en la misma instancia**, que es la opción B. Con ello decae también el modelo de costes de `§4` (infraestructura por instancia) y el criterio de salto de `§7`. Ambas secciones se reescriben cuando el programa llegue a su fase de coste (v0.85.0), no antes: hasta entonces conviven con una nota que apunta aquí.

## 2. Diagnóstico verificado

Medido el 2026-08-06 contra el código de `v0.79.2` y la base de producción. Las cifras importan porque determinan dónde está el coste real.

### Lo que abarata el trabajo

- **El volumen de datos es mínimo**: 76 perfiles vivos, 108 runs, 11 campañas, 4 análisis GEO, 4 retos de Momentum, 4 ofertas de pricing, 2 tests A/B, 2 targets, 1 marca, 1 embudo, 1 copy deck. Unas 200 entidades de dominio y 802 filas de telemetría. **El backfill de la migración es trivial**: el coste está en el código, no en los datos.
- **`profiles.optimized_for` ya es un proto-proyecto** y da el backfill casi hecho: 15 perfiles de IVI, 3 de SegurCaixa Adeslas Dental, 1 de O2 Spain, 1 mal etiquetado como «Formulario onboarding» (es un origen, no un cliente) y 55 sin cliente asignado.
- **Toda la capa de datos está centralizada** en 25 ficheros de `lib/`. No hay consultas sueltas repartidas por los componentes.
- **Las tablas hijas heredan por clave ajena**: de las 28 tablas, solo 13 necesitan `project_id` propio. Las otras 15 lo obtienen de su padre.

### Lo que lo encarece y lo hace delicado

- **~190 puntos de acceso a base** (`.from(...)`) que hoy no filtran por nada, porque no existe el concepto de cliente. Cada uno es un sitio donde olvidar el filtro.
- **La sesión es una cookie compartida de valor constante**: `auth_suaas=ok` (`lib/auth.ts:4`, `proxy.ts:55-60`). Se puede fabricar sin conocer la contraseña. Es el hallazgo **A-01** de `AUDITORIA-SEGURIDAD.md`, y mientras siga así **cualquier sistema de roles montado encima es decorativo**.
- **`/api/auth` no tiene rate limit** (VULN-05): la contraseña es atacable por fuerza bruta.
- **Todo el acceso va con service role** (`lib/supabase.ts:22`), que ignora la RLS. La RLS está activada en las 28 tablas pero **sin policies**: hoy la base no aísla nada, aísla el código.
- **Hay superficie interna que un cliente no debe ver nunca** y que hoy está abierta a quien entre: `/diag`, `/tokens`, `/evaluacion`, `/seed-examples`, `/trash`, `/gravity`, la vista interna de `/propuesta` y el visor `/docs`, que sirve toda la documentación del repositorio, **incluido este plan y el plan de venta con los márgenes**.

Los dos primeros puntos ya estaban anotados en `Plan-venta.md §2.5` como riesgo aceptado con un operador interno e **inaceptable con clientes**. Con la decisión tomada, dejan de ser aplazables.

### Las 13 tablas raíz

`profiles`, `targets`, `funnels`, `ab_tests`, `copy_decks`, `pricing_offers`, `campaigns`, `geo_analyses`, `momentum_challenges`, `brands`, `runs`, `evals`, `gateway_usage`.

Heredan por clave ajena: `funnel_steps`, `funnel_step_responses`, `five_second_responses`, `copy_blocks`, `copy_responses`, `pricing_prices`, `pricing_responses`, `campaign_responses`, `ab_test_runs`, `messages`, `metrics`, `brand_documents`, `brand_document_chunks`.

Quedan fuera a propósito: `app_settings` (configuración global de la plataforma) y `suaas_migrations` (tracking técnico).

## 3. Fase 1 · Proyectos como ámbito de trabajo

**Versión: v0.80.0.** Riesgo medio-bajo, reversible. Esfuerzo estimado: 2-4 sesiones.

Resuelve el problema que ya existe hoy: los 76 perfiles de cuatro clientes distintos conviven en la misma rejilla y nada impide seleccionarlos juntos en un run.

1. **Migración**: tabla `projects` (nombre, slug, cliente, estado), `project_id` en las 13 tablas raíz, backfill desde `optimized_for` y un proyecto «Flat 101 · interno» que recoja los 55 perfiles huérfanos y el resto de entidades sueltas. Índice por `project_id` en las tablas con volumen.
2. **Capa de acceso única con ámbito obligatorio**: un helper por el que pasen todas las consultas y que inyecte el filtro de proyecto. **Es la pieza que decide si el programa sale bien o mal**: sin ella, el ámbito hay que recordarlo en ~190 sitios. Se acompaña de una regla de lint que impida usar `.from(` fuera de esa capa.
3. **Proyecto activo resuelto en servidor**. El ámbito no viaja nunca en el cuerpo de la petición ni en un parámetro que el cliente pueda manipular.
4. **Guardas en los 8 runners**: si algún `profileId` o entidad no pertenece al proyecto activo, la petición se rechaza con un error explícito.
5. **Gestión de proyectos**: crear, listar, editar y archivar.

**Verificación de la fase**: intentar lanzar un run mezclando perfiles de dos proyectos y comprobar el rechazo en servidor, no solo en la interfaz.

## 4. Fase 2 · Identidad, roles y aislamiento garantizado

**Versiones: v0.81.0 a v0.84.0.** Riesgo alto: toca la puerta de entrada de toda la aplicación. Esfuerzo estimado: 4-7 sesiones.

Es la fase que convierte la separación por proyectos en una garantía. Se parte en cuatro entregas para que cada una tenga su propio ciclo de verificación y despliegue.

- **v0.81.0 · Identidad real**. Supabase Auth sustituye a la contraseña global. Con ello desaparece la cookie de valor constante (cierra A-01) y se añade rate limit en el login (cierra VULN-05). Login nuevo, recuperación de acceso y cierre de sesión.
- **v0.82.0 · Membresías y roles**. Tabla de membresías usuario × proyecto × rol, con tres roles: **propietario** (Flat 101, ve todos los proyectos), **operador** (trabaja dentro de los proyectos que tiene asignados) y **cliente** (lectura de lo suyo). La lista de proyectos accesibles sale de las membresías, nunca de la URL. Interfaz de gestión: invitar, asignar rol, revocar.
- **v0.83.0 · RLS de verdad, tabla a tabla**. Policies por proyecto empezando por las tablas con datos de cliente (`profiles`, `brands`, `brand_documents`, `brand_document_chunks`, `campaigns`, `runs`), con el usuario autenticado en las lecturas y el service role reservado a los runners y la telemetría. Se hace de forma incremental, con la aplicación en marcha, para que un fallo afecte a una tabla y no a todas.
- **v0.84.0 · Superficies internas por rol**. Inventario y cierre de `/diag`, `/tokens`, `/evaluacion`, `/seed-examples`, `/trash`, `/gravity`, `/docs` y la vista interna de `/propuesta`.

**Verificación de la fase**: un usuario de prueba con acceso solo a IVI no ve absolutamente nada de Adeslas, tampoco escribiendo a mano los identificadores en la URL, y no alcanza ninguna superficie interna.

## 5. Fase 3 · Coste y presupuesto por proyecto

**Versión: v0.85.0.** Riesgo bajo. Esfuerzo estimado: 1-2 sesiones.

Con varios clientes compartiendo instancia, el presupuesto global actual (`SUAAS_DAILY_TOKEN_BUDGET`, una sola API key del AI Gateway) deja de servir: un cliente puede agotar el saldo de otro y no hay forma de refacturar consumos.

1. `project_id` en la telemetría del gateway (ya incluido en la migración de la fase 1) y atribución de todos los scopes.
2. Presupuesto por proyecto sustituyendo al gate global, con su rechazo accionable cuando se agota.
3. `/tokens` filtrado por proyecto: consumo, coste real y saldo por cliente.
4. Reescritura de `Plan-venta.md §1`, `§4` y `§7` al modelo multiproyecto.

## 6. Fase 4 · Arquetipos y representatividad

**Versiones: v0.86.0 y v0.87.0.** Riesgo bajo. Esfuerzo estimado: 2-3 sesiones. Volumen objetivo acordado: **30 a 80 perfiles por proyecto**.

Es la fase que más refuerza el discurso metodológico: se pasa de «tengo 15 perfiles de IVI» a «tengo una muestra estratificada que replica la distribución declarada del público», que es como trabaja la investigación de mercado con cuotas.

- **v0.86.0 · Modelo y generación**. Tabla `archetypes` por proyecto (nombre, descripción, **cuota** o peso en la población real) y `profiles.archetype_id`. Generación por arquetipo extendiendo el generador existente, alimentada por la investigación de público del proyecto. Con 30 a 80 perfiles y unos céntimos por perfil, poblar un proyecto entero cuesta menos de un euro.
- **v0.87.0 · Muestreo estratificado y representatividad**. En el panel de lanzamiento, «muestra representativa de N» reparte la selección por cuotas en lugar de elegir a dedo. En los resultados, ficha de representatividad: qué cuotas se cubrieron y con qué desviación respecto a la población declarada.

**Matiz metodológico que fija esta fase**: no se lanza el censo. El panel topa en 20 perfiles y 200 combinaciones por run (`components/profile-launch-panel.tsx:132`), y el coste lo desaconseja igualmente. La representatividad se consigue **muestreando por cuotas**, no lanzando a toda la población. Como la muestra queda autoponderada, las medias simples que ya calculan los seis runners siguen siendo correctas y **no hay que tocar la agregación**.

## 7. Mapa de versiones

Punto de partida: `v0.79.2`. Techo del programa: **v0.90.0**.

| Versión | Entrega |
|---|---|
| v0.80.0 | Fase 1: proyectos como ámbito |
| v0.81.0 | Identidad real (cierra A-01 y VULN-05) |
| v0.82.0 | Membresías y roles |
| v0.83.0 | RLS por proyecto, tabla a tabla |
| v0.84.0 | Superficies internas por rol |
| v0.85.0 | Coste y presupuesto por proyecto |
| v0.86.0 | Arquetipos: modelo y generación |
| v0.87.0 | Muestreo estratificado y representatividad |
| v0.88.x - v0.89.x | Reserva para desbordes y ajustes |
| **v0.90.0** | **Cierre del programa multiproyecto** |

Los patches intermedios (`v0.80.1`, `v0.83.2`, etc.) siguen la convención habitual del proyecto para correcciones y ajustes dentro de cada entrega.

## 8. Esfuerzo total

| Fase | Versiones | Riesgo | Esfuerzo |
|---|---|---|---|
| 1 · Proyectos | v0.80.0 | Medio-bajo | 2-4 sesiones |
| 2 · Identidad y roles | v0.81.0 a v0.84.0 | Alto | 4-7 sesiones |
| 3 · Coste por proyecto | v0.85.0 | Bajo | 1-2 sesiones |
| 4 · Arquetipos | v0.86.0 y v0.87.0 | Bajo | 2-3 sesiones |
| | | **Total** | **9-16 sesiones** |

La fase 2 es la que puede desviarse: es la única que toca la autenticación de toda la aplicación.

## 9. Condición de arranque

**No se crea ninguna cuenta de cliente hasta que la fase 2 esté cerrada y verificada** con un usuario de prueba que no alcance el proyecto ajeno ni escribiendo la URL a mano. Hasta entonces, las fases 1, 3 y 4 son plenamente útiles para el trabajo interno de Flat 101.

Fuera del código, y antes de meter documentos de un cliente en una base compartida con otro: conviene tener resuelto el encargo de tratamiento que cubra lo que guarda Cerebro (analítica, informes, VoC), incluidos los documentos marcados como privados.

## 10. Puntos de diseño abiertos

Se resuelven al llegar a su fase, pero conviene tenerlos anotados:

- **Cuestionario público `/onboard`**: hoy crea perfiles sin login. Habrá que emitir el enlace con el proyecto dentro (token) para que el gemelo digital aterrice donde toca. Fase 1.
- **Ficheros en Vercel Blob** (retratos, capturas): la URL es pública aunque no adivinable. Con clientes externos conviene valorar Blob privado. Fase 2.
- **`app_settings`**: hoy es global (modelos del chat, de las runs y del GEO Tester). Decidir si algún ajuste pasa a ser por proyecto o si todos siguen siendo decisión de Flat 101. Fase 2.
- **`evals`**: el banco de pruebas es una herramienta interna de calidad, no un dato de cliente. Probablemente deba quedar fuera del ámbito de proyecto pese a estar en la lista de tablas raíz. Decidir en la fase 1.
- **Papelera `/trash`**: hoy lista los borrados de los 9 tipos sin filtro. Pasa a filtrarse por proyecto en la fase 1 y por rol en la fase 2.
- **Perfiles compartidos**: decidir si los 55 perfiles genéricos del proyecto interno pueden reutilizarse desde un proyecto de cliente o si cada proyecto vive con los suyos. Afecta al diseño de la clave ajena. Fase 1.

## 11. Qué no entra en este programa

- Autoservicio de registro (un cliente dándose de alta solo).
- Facturación automática o pasarela de pago.
- Personalización visual por cliente (marca blanca).
- Migración de los datos históricos previos a la fase 1 más allá del backfill descrito.
