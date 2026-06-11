/**
 * Constantes del Campaign Tester compartidas con componentes cliente.
 *
 * Vive separado de campaign.ts porque ese módulo arrastra dependencias de
 * servidor (sharp vía image-source, Supabase con service role) que no pueden
 * entrar en el bundle del navegador. Los tipos pueden importarse de
 * campaign.ts con `import type` (se borran al compilar); los VALORES que
 * necesite un componente cliente deben vivir aquí.
 */

/**
 * Query placeholder para estrategias sin queries (Display): el runner genera
 * al menos 1 respuesta por perfil × canal bajo este contexto. La UI la
 * traduce a una etiqueta legible.
 */
export const GENERAL_CONTEXT_QUERY = "(contexto general)";
