// @ts-check
/**
 * Health check da conexão com o Supabase.
 * Uso: npm run health:supabase   (lê .env.local)
 *
 * Verifica:
 *  1. Auth responde (chave pública).
 *  2. Banco responde via PostgREST (chave secreta).
 *  3. Bucket "sources" existe, é privado, limite 25 MB e aceita só PDF/DOCX.
 */
import { z } from "zod";
import { publicEnvSchema, serverEnvSchema } from "../src/lib/env.js";

const BUCKET = "sources";
const EXPECTED_LIMIT = 25 * 1024 * 1024;
const EXPECTED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const schema = z.object({
  ...publicEnvSchema.pick({
    NEXT_PUBLIC_SUPABASE_URL: true,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: true,
  }).shape,
  ...serverEnvSchema.pick({ SUPABASE_SECRET_KEY: true }).shape,
});

/**
 * @param {string} url
 * @param {string} key
 * @returns {Promise<Response>}
 */
function get(url, key) {
  const headers = { apikey: key };
  // Chaves antigas (JWT) também precisam ir no Authorization.
  if (key.startsWith("eyJ")) Object.assign(headers, { Authorization: `Bearer ${key}` });
  return fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
}

/**
 * @param {string} name
 * @param {() => Promise<string>} check
 * @returns {Promise<boolean>}
 */
async function run(name, check) {
  try {
    const detail = await check();
    console.log(`✔ ${name}${detail ? ` — ${detail}` : ""}`);
    return true;
  } catch (error) {
    console.error(`✖ ${name} — ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * @param {Response} res
 */
async function expectOk(res) {
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    console.error(`✖ Variáveis ausentes ou inválidas em .env.local: ${names}`);
    process.exit(1);
  }
  const env = parsed.data;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");

  const results = [
    await run("Auth", async () => {
      const res = await get(`${base}/auth/v1/health`, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
      await expectOk(res);
      return "ok";
    }),
    await run("Banco (PostgREST)", async () => {
      const res = await get(`${base}/rest/v1/`, env.SUPABASE_SECRET_KEY);
      await expectOk(res);
      return "ok";
    }),
    await run(`Bucket "${BUCKET}"`, async () => {
      const res = await get(`${base}/storage/v1/bucket/${BUCKET}`, env.SUPABASE_SECRET_KEY);
      await expectOk(res);
      /** @type {{ public: boolean, file_size_limit: number | null, allowed_mime_types: string[] | null }} */
      const bucket = await res.json();
      const problems = [];
      if (bucket.public) problems.push("deveria ser privado");
      if (bucket.file_size_limit !== EXPECTED_LIMIT) problems.push("limite diferente de 25 MB");
      const mimes = [...(bucket.allowed_mime_types ?? [])].sort().join(",");
      if (mimes !== [...EXPECTED_MIMES].sort().join(","))
        problems.push("tipos de arquivo diferentes");
      if (problems.length) throw new Error(problems.join("; "));
      return "privado, 25 MB, PDF/DOCX";
    }),
  ];

  const ok = results.every(Boolean);
  console.log(ok ? "\nSupabase OK." : "\nHá problemas na conexão com o Supabase.");
  process.exit(ok ? 0 : 1);
}

await main();
