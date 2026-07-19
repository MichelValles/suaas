# Guía Integral de Usuarios Sintéticos en UX y CRO: De la Teoría a la Experimentación Predictiva

> **Nota editorial (v0.61.16)**: este documento es la base teórica fundacional del motor y conserva su contenido original; en esta revisión solo se ha saneado la forma (markdown que no renderizaba, formato de números, atribuciones de citas). Dos advertencias para su uso: (1) las cifras y citas de expertos que contiene **no llevan referencia bibliográfica formal recuperada**, así que no deben citarse ante una audiencia académica sin localizar la fuente primaria; (2) el contraste entre esta teoría y lo que SUAAS implementa de verdad (qué pilares se cumplen, cuáles no y con qué matices) está en [`PERFILES-CALIBRADOS.md`](./PERFILES-CALIBRADOS.md). El término «usuarios sintéticos» queda reservado a este contexto teórico; el término de producto es «perfiles calibrados».

## 1. Fundamentos de los Usuarios Sintéticos

En el ecosistema actual de la investigación de usuarios (UXR) y la optimización de la conversión (CRO), los **usuarios sintéticos** emergen no como meros «buyer personas» estáticos, sino como agentes digitales dinámicos impulsados por Modelos de Lenguaje de Gran Tamaño (LLM). Estas entidades son representaciones computacionales diseñadas para mimetizar el comportamiento, las respuestas cognitivas y las barreras psicológicas de segmentos poblacionales específicos.

### Propuesta de Valor para Growth & CRO

La integración de agentes sintéticos permite a las organizaciones transitar hacia una **experimentación predictiva**. En lugar de depender exclusivamente de tests A/B que requieren semanas de tráfico orgánico y altos costes de reclutamiento, los estrategas de Growth pueden ejecutar simulaciones de usabilidad masivas en minutos. Esta tecnología actúa como un filtro de eficiencia, permitiendo descartar variantes de bajo rendimiento y refinar la propuesta de valor antes de comprometer recursos en tráfico real.

### Los Tres Pilares de la Fidelidad Sintética

Para garantizar la validez estadística de las simulaciones, la arquitectura del agente debe sostenerse sobre tres ejes:

- **Calibración del Perfil (VoC):** superar la IA genérica alimentando al modelo con datos reales de la «Voz del Cliente» (VoC), transcripciones de soporte y reseñas.
- **Detección de Fricción:** identificación de obstáculos mediante el **Ratio de Esfuerzo Percibido por la IA**, una métrica predictiva de abandono en embudos críticos.
- **Validación de Heurísticas:** evaluación instantánea basada en principios de psicología cognitiva, como la Ley de Hick (carga de decisión) y las heurísticas de usabilidad de Jakob Nielsen.

---

## 2. Metodología de Creación: El Marco de Trabajo «Grounded»

Para mitigar los sesgos inherentes de los LLM, la creación de usuarios debe seguir un proceso de dos etapas denominado **Grounded Modeling**. Este enfoque prioriza la fidelidad al dato real sobre la generación creativa.

1. **Generación de Datos Estructurados:** se extraen parámetros demográficos, comportamentales y de salud de datasets reales (como *LifeSnaps* para patrones de sueño o *Project Baseline Health Study* para condiciones metabólicas).
2. **Desarrollo de Vignettes:** se transforman esos datos en perfiles narrativos complejos. Un usuario «grounded» no es una instrucción genérica; es una descripción situada en una historia de vida y un contexto de salud específico.

### Componentes de una «Vignette» Efectiva

| Componente | Definición y Ejemplo |
| :--- | :--- |
| **Datos Demográficos** | Edad, género, ocupación e ingresos (ej. varón, 34 años, tech entrepreneur). |
| **Personalidad (Big Five)** | Marcadores de Apertura, Conciencia, Extraversión, Amabilidad y Neuroticismo. |
| **Barreras COM-B** | Clasificación de retos en Capacidad (ej. *planning fallacy*), Oportunidad (ej. falta de apoyo social) y Motivación. |
| **Trasfondo (Backstory)** | Narrativa que conecta metas y miedos (ej. «Teme fallar a su familia por falta de energía»). |

---

## 3. Simulación e Interacción con Agentes

La simulación avanzada requiere **Modelos Generativos Basados en Agentes (GABM)**. El estándar de oro actual es **Concordia**, un sistema de código abierto diseñado para simular interacciones donde los agentes actúan basados en una memoria asociativa y razonamiento lógico.

### Arquitectura Talker-Reasoner: Sistemas 1 y 2

Inspirada en la psicología cognitiva de Daniel Kahneman, esta arquitectura divide al agente en dos procesos:

- **Agente Razonador (Reasoner):** emula el **Sistema 2**. Es analítico y lento; crea un modelo interno del estado del usuario, planifica acciones y analiza el historial de interacción.
- **Agente Hablador (Talker):** emula el **Sistema 1**. Es fluido e intuitivo; genera el diálogo final basándose en las directrices lógicas del razonador.

Esta estructura permite un **logging de Chain-of-Thought (CoT)**, proporcionando trazabilidad total sobre *por qué* un agente decidió, por ejemplo, que un proceso de checkout era demasiado complejo.

---

## 4. Aplicaciones Prácticas en el Ciclo de Optimización

### Matriz de Aplicación en Growth

| Fase del Proceso | Uso del Usuario Sintético | Objetivo Clave | Métrica Asociada |
| :--- | :--- | :--- | :--- |
| **Auditoría de Landing** | Test de claridad de 5 segundos. | Comprensión de propuesta. | Tasa de Comprensión (Fuzzy-Match) |
| **Pre-test de Copy** | Análisis de resonancia cognitiva. | Reducción de sesgos. | Recall y Precisión de Barreras |
| **Simulación de Flujo** | Navegación de embudo completo. | Identificación de drop-off. | Ratio de Esfuerzo Percibido |
| **Elasticidad de Precios** | Simulación de Monte Carlo. | Estimación de demanda. | Curva de Elasticidad de Demanda |

**Nota sobre precio:** la simulación de Monte Carlo impulsada por LLM permite crear miles de perfiles con distintas sensibilidades al coste para proyectar una curva de demanda estimada sin arriesgar ingresos reales. *(Aspiracional: la implementación actual de SUAAS calcula un sweet spot por argmax de ingreso esperado, sin Monte Carlo ni curva de elasticidad; ver `PERFILES-CALIBRADOS.md`, sección 5.3.)*

---

## 5. Validación y Calidad: El Puente entre Salud y Negocio

La validez de los usuarios sintéticos ha sido probada en entornos de alta complejidad como la gestión de la diabetes y el sueño. Estos hallazgos constituyen la **prueba de concepto estadística** para el CRO: si un LLM puede simular con precisión las barreras de un paciente crónico, puede identificar las fricciones de un comprador online.

- **Precisión en el Diagnóstico:** en estudios de sueño, los agentes identificaron la **preocupación principal por el sueño** del usuario con un **89,7% de precisión** tras solo 10 turnos de interacción.
- **Recuperación de Barreras:** los modelos alcanzaron un **71,4% de recall medio** en la identificación de obstáculos específicos utilizando técnicas de **fuzzy-matching** para capturar variaciones lingüísticas.
- **Superioridad del Perfil Grounded:** en pruebas ciegas, expertos humanos prefirieron los agentes basados en datos completos sobre los basados solo en demografía por su mayor realismo y consistencia.

*(Las tres cifras se citan sin referencia bibliográfica formal en el material original; pendiente de recuperar la fuente primaria.)*

---

## 6. Riesgos, Limitaciones y Ética

1. **Sesgo de «Cámara de Eco»:** los modelos pueden amplificar sesgos de entrenamiento, validando hipótesis falsas si el prompt no es neutral.
2. **Falta de «Ruido» Emocional:** la IA es intrínsecamente lógica. Los humanos reales actúan bajo fatiga, distracciones o impulsos irracionales.
3. **Alucinaciones de Usabilidad:** riesgo de inventar problemas inexistentes o ignorar bugs técnicos obvios.
4. **Privacidad y RGPD:** aunque permiten el **Privacy by Design** (testar sin exponer PII o datos personales sensibles), existe el riesgo de fuga si se utilizan modelos públicos sin anonimización.

### Mitigación mediante Negative Prompting

Para evitar que el agente sea «demasiado cooperativo», es imperativo utilizar prompts negativos. **Ejemplos:** «El usuario tiene baja alfabetización digital», «El usuario tiene prisa extrema y es escéptico ante las promesas de marketing», o «El usuario es rudo e impaciente».

---

## 7. Perspectivas de la Industria y Expertos

> «No existe el usuario promedio. Los resultados promediados no representan la complejidad de las interacciones humanas reales.» (Prof. Hiroshi Ishii, MIT Media Lab)

> «La IA podría amplificar nuestros sesgos en lugar de cuestionarlos. Las contradicciones entre lo que los usuarios dicen y hacen suelen ser los mejores hallazgos.» (Ruben Stegbauer, UX Manager en Google)

> «Los datos sintéticos podrían revelar matices pasados por alto al simular grupos que a menudo no están representados.» (Dra. Sara Bouzit, Head of Research & Insights (NL) en EPAM)

### Datos de Adopción (N=1.093)

El **77,1%** de los profesionales de UXR ya integran IA. El uso se distribuye en:

- **ChatGPT:** 51,1% (herramienta líder).
- **Transcripción:** 47,8%.
- **Toma de notas:** 40,8%.

---

## 8. Protocolo de Implementación: El Ciclo de 5 Pasos

1. **Definición del Prompt Persona:** carga psicográfica y de datos «grounded» (COM-B, Big Five).
2. **Simulación de Tarea:** el agente ejecuta el flujo de conversión (ej. checkout).
3. **Identificación de Fricciones:** análisis de logs y CoT para detectar confusión.
4. **Ajuste de Variante:** rediseño proactivo basado en el feedback del agente.
5. **Validación Humana:** test A/B final con usuarios reales (el «Gold Standard»).

---

## 9. Conclusión y Futuro de la Investigación Sintética

La metodología de usuarios sintéticos transforma la innovación de un ciclo de meses a uno de minutos, actuando como un filtro de eficiencia competitiva. Sin embargo, la validación final con humanos sigue siendo el estándar irremplazable. La IA no sustituye la empatía humana; la escala para permitir que los investigadores se centren en los problemas más complejos y humanos del diseño.
