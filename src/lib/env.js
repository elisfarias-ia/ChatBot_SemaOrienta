// @ts-check
/**
 * Configuração do projeto validada com Zod.
 *
 * - Único arquivo que pode ler `process.env` (regra de lint).
 * - `getPublicEnv()` pode ser usado no navegador (só variáveis `NEXT_PUBLIC_*`).
 * - `getServerEnv()` só no servidor; falha se chamado no navegador.
 * - A validação é preguiçosa (na primeira chamada) para não quebrar build/testes
 *   que não precisam de configuração; o resultado fica em cache.
 *
 * Documentação de cada variável: `.env.example`.
 */
import { z } from "zod";

/**
 * Trata string vazia (`VAR=` no .env) como ausente.
 * @param {unknown} value
 */
const emptyToUndefined = (value) => (value === "" ? undefined : value);

const requiredString = z.preprocess(emptyToUndefined, z.string().min(1));
const requiredUrl = z.preprocess(emptyToUndefined, z.url());
const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

/** @param {number} fallback */
const positiveInt = (fallback) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(fallback));

/** @param {string} fallback */
const stringWithDefault = (fallback) =>
  z.preprocess(emptyToUndefined, z.string().min(1).default(fallback));

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SITE_URL: requiredUrl,
  NEXT_PUBLIC_SUPABASE_URL: requiredUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: requiredString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: requiredString,
});

export const serverEnvSchema = z.object({
  // Supabase
  SUPABASE_SECRET_KEY: requiredString,
  SUPABASE_STORAGE_BUCKET: stringWithDefault("fontes"),
  // LLM principal (Google)
  GOOGLE_GENERATIVE_AI_API_KEY: requiredString,
  GOOGLE_CHAT_MODEL: stringWithDefault("gemini-2.5-flash"),
  GOOGLE_EMBEDDING_MODEL: stringWithDefault("gemini-embedding-001"),
  EMBEDDING_DIMENSIONS: positiveInt(768),
  // LLM de reserva (Groq) — opcional: sem chave, o fallback fica desligado.
  GROQ_API_KEY: optionalString,
  GROQ_CHAT_MODEL: stringWithDefault("llama-3.3-70b-versatile"),
  // Cloudflare Turnstile
  TURNSTILE_SECRET_KEY: requiredString,
  // Limites do chat público
  CHAT_RATE_LIMIT_PER_MINUTE: positiveInt(10),
  CHAT_MAX_QUESTION_CHARS: positiveInt(1000),
});

/** @typedef {z.infer<typeof publicEnvSchema>} PublicEnv */
/** @typedef {z.infer<typeof serverEnvSchema>} ServerEnv */

/**
 * Monta uma mensagem de erro legível, sem expor valores.
 * @param {string} scope
 * @param {z.ZodError} error
 * @returns {Error}
 */
function toConfigError(scope, error) {
  const lines = error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  return new Error(
    `Configuração ${scope} inválida:\n${lines.join("\n")}\nVeja o arquivo .env.example.`,
  );
}

/**
 * Valida variáveis públicas a partir de uma fonte qualquer (útil em testes).
 * @param {Record<string, string | undefined>} source
 * @returns {PublicEnv}
 */
export function parsePublicEnv(source) {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) throw toConfigError("pública", result.error);
  return result.data;
}

/**
 * Valida variáveis de servidor a partir de uma fonte qualquer (útil em testes).
 * @param {Record<string, string | undefined>} source
 * @returns {ServerEnv}
 */
export function parseServerEnv(source) {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) throw toConfigError("do servidor", result.error);
  return result.data;
}

/** @type {PublicEnv | undefined} */
let publicCache;
/** @type {ServerEnv | undefined} */
let serverCache;

/**
 * Variáveis públicas. As referências são estáticas para o Next.js
 * conseguir embutir os valores no bundle do navegador.
 * @returns {PublicEnv}
 */
export function getPublicEnv() {
  publicCache ??= parsePublicEnv({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  });
  return publicCache;
}

/**
 * Variáveis secretas do servidor. Nunca chame em componentes de cliente.
 * @returns {ServerEnv}
 */
export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() não pode ser usado no navegador.");
  }
  serverCache ??= parseServerEnv(process.env);
  return serverCache;
}
