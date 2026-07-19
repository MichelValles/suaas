# GEO · Prueba IVI con motores reales (protocolo repetible)

Registro de la primera prueba del GEO Tester con sondas reales (v0.56, 2026-06-13): la misma marca y los mismos segmentos lanzados dos veces, una con los modelos ligeros y otra con los frontera, para medir visibilidad y comparar niveles. Sirve como protocolo para repetir el análisis cuando se quiera medir evolución o validar cambios del módulo.

Análisis en producción (perviven como histórico):

- Ligeros: `https://suaas.flat101.business/geo/88f8bf1d-6256-4131-922a-cedcd61a840c`
- Frontera: `https://suaas.flat101.business/geo/dc3a448e-1b1e-40da-9261-a7b90321f6ab`

## Datos de entrada (copiar tal cual para repetir)

**Marca:** IVI

**Descripción:** IVI (Instituto Valenciano de Infertilidad), parte del grupo IVIRMA Global, es una red internacional de clínicas de reproducción asistida nacida en Valencia y líder en España. Ofrece FIV, ovodonación, preservación de la fertilidad y diagnóstico genético preimplantacional, con unidades en las principales ciudades españolas y tasas de éxito publicadas.

| Segmento | JTBD | Query |
|---|---|---|
| Pareja que empieza FIV | Cuando llevamos más de un año intentando el embarazo sin éxito quiero saber qué clínica de reproducción asistida ofrece más garantías para poder decidir dónde empezar un tratamiento | `mejor clínica de fertilidad en España para FIV` |
| Mujer que congela óvulos | Cuando decido aplazar la maternidad quiero entender precios y fiabilidad de la congelación de óvulos para poder elegir dónde preservar mi fertilidad | `congelar óvulos en España precio y mejores clínicas` |
| Paciente que compara tasas de éxito | Cuando comparo clínicas de reproducción asistida quiero ver tasas de éxito reales y verificables para poder fiarme de la clínica que elija | `tasas de éxito FIV clínicas España comparativa 2026` |

## Cómo repetirlo

1. En `/tokens → Modelos del GEO Tester`, elegir el nivel: ligeros (Haiku 4.5 · Sonar · GPT-5.4 mini) o frontera (Opus 4.8 · Sonar Pro · GPT-5.5).
2. Crear el análisis en `/geo/new` con los datos de arriba (o duplicar por SQL una fila existente de `geo_analyses` con `status='pending'`).
3. Pulsar «Analizar» en `/geo/[id]`. Duración orientativa: ~45 s con ligeros, ~3 min con frontera (3 segmentos).
4. Para comparar niveles, crear dos análisis gemelos y cambiar los modelos en `/tokens` entre uno y otro.

## Resultados (2026-06-13, posición · visibilidad)

| Segmento | Claude ligero → frontera | ChatGPT ligero → frontera | Perplexity ligero → frontera |
|---|---|---|---|
| Pareja que empieza FIV | Secundaria 40% → Secundaria 55% | **Ausente 0% → Protagonista 100%** | Secundaria 60% → Secundaria 60% |
| Mujer que congela óvulos | **Protagonista 85%** → Secundaria 60% | Secundaria 60% → Secundaria 72% | Secundaria 50% → Secundaria 60% |
| Compara tasas de éxito | Secundaria 55% → **Protagonista 100%** | Secundaria 20% → **Ausente 0%** | Secundaria 70% → Secundaria 55% |
| **Media por motor** | **60% → 72%** | **27% → 57%** | **60% → 58%** |

Media global de IVI: 49% con ligeros, 62% con frontera.

## Hallazgos

- **La varianza entre runs es real y grande**: cada sonda busca la web de nuevo y sintetiza distinto (ChatGPT pasó de ausente a protagonista en FIV y de secundaria a ausente en tasas). Una foto única es una muestra, no una verdad: la diferencia ligeros/frontera mezcla calidad del modelo y ruido entre runs. Para conclusiones de cliente, repetir el análisis a mano y mirar tendencia.
- **La señal robusta son los huecos**: «tasas de éxito verificadas (SEF) por grupo de edad» y «volumen de ciclos realizados» aparecen como atributos ausentes en ambos niveles y en varios motores. Eso es lo accionable.
- **Perplexity es el motor más estable** (secundaria 50-70% en los 6 runs, siempre con citas). **Claude aporta más fuentes** (16-20 citas por respuesta con Opus). **ChatGPT es el más volátil** para esta marca.
- **Coste real medido**: ~0,10 $ el análisis ligero, ~2 $ el frontera (GPT-5.5 dispara el input: ~37k tokens por sonda con `searchContextSize: medium`). Estrategia validada: iterar en ligero, validar en frontera.

## Incidencia registrada (resuelta)

El primer run frontera completó las 9 sondas pero falló al persistir: las respuestas con contenido web raspado arrastraban el carácter nulo U+0000, que Postgres rechaza en jsonb («unsupported Unicode escape sequence»). Resuelto en v0.56.1 (`stripNullChars` en `lib/geo.ts` antes del update). Si un run frontera vuelve a quedar en `error` con las sondas registradas en `gateway_usage`, mirar primero esta clase de causa en los logs de Vercel.
