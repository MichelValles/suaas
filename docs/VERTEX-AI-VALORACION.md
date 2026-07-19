# Valoración · Google Vertex AI para SUAAS

**Fecha**: 5 de julio de 2026. **Método**: investigación multiagente (3 lectores del repo, 6 investigadores web, 10 verificadores adversariales sobre los claims decisivos: 8 confirmados, 2 matizados con la corrección incorporada). Fuentes oficiales de Google Cloud y Vercel de 2025-2026.

**Nota de contexto**: en abril de 2026 Google renombró Vertex AI como «Gemini Enterprise Agent Platform». Es un rebranding confirmado, no una deprecación: Model Garden pervive como catálogo y los endpoints (`aiplatform.googleapis.com`) no cambian. Aquí se usa «Vertex» por brevedad.

## 1. Qué aportaría cada pieza al caso SUAAS

### Model Garden: poco

Catálogo de más de 200 modelos con dos modos: MaaS por token (Gemini, Claude, Mistral, Llama) y self-deploy por nodo-hora, facturado incluso con el endpoint ocioso. No es un router: sin failover entre proveedores y sin modelos propietarios de OpenAI. El Vercel AI Gateway actual ya sirve Claude y Gemini con 0 % de markup y puede usar Vertex como upstream vía BYOK. Son capas complementarias; sustituir el gateway restaría failover sin ahorrar coste por token.

### RAG Engine / Vertex AI Search: el hueco es real, la pieza encaja mal

SUAAS no tiene RAG: `buildBrandContext` (`lib/cerebro.ts`) trunca a ciegas a 30.000 caracteres un corpus creciente (brand_documents, transcripciones, respuestas cualitativas, backstories). Pero RAG Engine encaja mal:

- GA desde diciembre de 2024, en 2026 solo en 4 regiones (us-central1 y us-east4 con allowlist, europe-west3 y europe-west4).
- No soporta pgvector ni AlloyDB como backend.
- Su RagManagedDb por defecto aprovisiona una instancia Spanner (tier Basic, 100 processing units, en un proyecto tenant de Google facturado al tuyo) del orden de 90 USD/mes aunque no haya tráfico. Solo el tier Unprovisioned detiene el gasto, y borra los datos de forma irreversible.

Ese coste fijo por proyecto rompe la economía de instancia dedicada por cliente (~10-12 $/mes marginales) del plan de venta. Vertex AI Search (hoy «Agent Search») es más asumible por ser pago por uso: 1,50 $/1.000 queries Standard o 4 $/1.000 Enterprise, 10.000 gratis/mes y ~5 $/GiB-mes de índice por encima de 10 GiB gratis. Queda como segunda opción si el RAG propio se queda corto.

### Grounding: encaje directo, y sin salir del gateway

Dos piezas con encaje inmediato:

1. **Grounding with Google Search**: en Gemini 3, 5.000 consultas gratis/mes y después 14 $/1.000 consultas, facturado por consulta desde el 5 de enero de 2026 (en Gemini 2.5, 35 $/1.000 grounded prompts). Es el candidato natural a cuarto motor GEO (`lib/geo-engines.ts`); a los volúmenes actuales entraría probablemente en la franja gratuita. Según la documentación del gateway funciona a través del propio Vercel AI Gateway (`vertex.tools.googleSearch`), sin cuenta GCP directa.
2. **Grounding con datos propios** (GA desde mayo de 2025): 2,50 $/1.000 prompts más las queries del datastore. Ancla respuestas de perfiles en un corpus VoC con citas, alineado con el pilar de calibración VoC de la base teórica (`docs/CONOCIMIENTO-USUARIOS-SINTETICOS.md`).

### Gen AI Evaluation: la pieza para el «grounding testing»

GA. Métricas model-based (groundedness pointwise y pairwise, instruction following, coherence, fluency, safety) más rúbricas custom, ejecutable vía Python (`client.evals`) o REST (`evaluateInstances` v1). Apto para regresiones de prompts en CI con dataset golden. Mapea tres pendientes del roadmap: formalizar los jueces LLM ya existentes en los runners, medir que cada perfil responde anclado a su vignette y su VoC, y la comparación Opus vs Sonnet. Coste: solo los tokens del modelo juez, sin tarifa fija.

### Agent Engine: no

Runtime gestionado GA desde marzo de 2025; Sessions y Memory Bank GA desde diciembre de 2025 (facturando desde el 28 de enero de 2026); Code Execution y la observabilidad de consola siguen en Preview. El despliegue gestionado del ADK cubre Python y Go; el Talker-Reasoner de SUAAS (`lib/agents.ts`) es TypeScript sobre AI SDK. La invocación externa exige OAuth2/IAM sin API keys. Sesiones, memoria y trazas ya las cubren Supabase y Vercel: migrar sería reescribir la capa de agentes entera sin beneficio neto.

## 2. Tres arquitecturas candidatas

### A. Gateway + pgvector en Supabase (elegida como base)

RAG propio: extensión pgvector, ingesta y chunking en la app, embeddings por API (p. ej. `gemini-embedding-001`, ~0,15 $/1M tokens), retrieval sustituyendo el truncado de `buildBrandContext`.

- **Pros**: cero coste fijo añadido, joins SQL con los datos de la app, replicable por instancia de cliente, sin segunda nube ni nueva auth, telemetría (`gateway_usage`) y presupuesto diario intactos.
- **Contras**: ingesta, chunking y reranking a mano; sin conectores gestionados.
- **Coste estimado**: menos de 5 $/mes por instancia (solo tokens de embeddings).

### B. Híbrido: Vercel + servicios Vertex puntuales (complemento recomendado)

Mantener AI SDK y gateway; añadir (1) grounding con Google Search para GEO (vía gateway o vía `@ai-sdk/google-vertex`, fijando la línea 4.x compatible con AI SDK v6), (2) Gen AI Evaluation por REST para regresiones y comparación de modelos, (3) opcionalmente un datastore de Vertex AI Search si el RAG de A se queda corto. Auth sin claves con Workload Identity Federation sobre el OIDC de Vercel.

- **Pros**: todo pago por uso, capacidades que el stack no tiene, sin mover el runtime.
- **Contras**: un proyecto GCP que operar (IAM, cuotas), doble facturación, camino Python-first en evaluación.
- **Coste estimado**: 0-50 $/mes según uso (grounding GEO posiblemente gratis; eval por tokens del juez; Search a 2,50 $/1.000 prompts más 1,50-4 $/1.000 queries si entra).

### C. Orquestación en Agent Engine (descartada)

Reescribir Talker-Reasoner y runners en Python o Go y dejar Next.js como frontend contra `reasoningEngines`.

- **Pros**: autoscaling, Sessions/Memory Bank gestionados, trazas, interoperabilidad A2A.
- **Contras**: reescritura completa de la capa de agentes, minting de tokens IAM desde Vercel, hop extra de latencia, observabilidad y facturación duplicadas, piezas clave aún en Preview. El coste directo es bajo pero el dominante son semanas de ingeniería con riesgo de regresión: lo que da ya lo cubren Supabase y Vercel.

## 3. Riesgos y fricciones

- **Auth**: Vertex exige IAM/service accounts; mitigable con WIF sobre OIDC sin claves persistentes, pero es infraestructura nueva a replicar por instancia de cliente.
- **Lenguaje del SDK**: los módulos clásicos de `vertexai` se eliminan el 24 de junio de 2026; la vía nueva es Python-first. Desde TypeScript quedan REST y `@ai-sdk/google-vertex` (vigilando el pin: el «latest» ya apunta a AI SDK 7).
- **Lock-in**: el corpus de RAG Engine vive en Spanner dentro de un proyecto tenant de Google; salir implica reingestar y el tier Unprovisioned borra los datos. pgvector no tiene ese problema.
- **Latencia**: hop de Vercel a GCP; conviene co-localizar la función (fra1/cdg1) con región europea. El endpoint global no garantiza residencia de datos.
- **GDPR**: RAG Engine tiene GA europeo (europe-west3/west4), pero cada servicio añadido amplía la superficie de datos. La garantía actual de que los documentos `sensitive` nunca salen de Supabase (`lib/cerebro.ts`) debe mantenerse también frente a Vertex.
- **Coste fijo**: la Spanner de RAG Engine (~90 $/mes o más por proyecto) multiplicaría el coste marginal por cliente; el índice de Search cobra almacenamiento por encima de 10 GiB aunque no haya tráfico.

## 4. Recomendación y hoja de ruta

**No adoptar Vertex como plataforma; adoptarlo como proveedor puntual de dos capacidades (grounding y evaluación) sobre la base A.**

1. **Ya**: RAG con pgvector en Supabase para Cerebro, sustituyendo el truncado de 30.000 caracteres por retrieval selectivo. Riesgo bajo, coste casi nulo, cierra el hueco mayor.
2. **Siguiente sprint**: sonda GEO con Gemini más Grounding with Google Search a través del gateway actual, sin cuenta GCP, como cuarto motor (5.000 consultas gratis/mes).
3. **Después**: proyecto GCP mínimo con WIF para Gen AI Evaluation: dataset golden, groundedness e instruction following en CI, y la comparación Opus vs Sonnet pendiente.
4. **Solo bajo demanda enterprise** (residencia de datos, gobernanza): BYOK de Vertex en el gateway con región europea.

Agent Engine y RAG Engine quedan fuera del plan: el primero por reescritura sin retorno, el segundo por un coste fijo incompatible con la instancia dedicada por cliente.
