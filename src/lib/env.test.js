// @ts-check
import { describe, expect, it } from "vitest";
import { parsePublicEnv, parseServerEnv } from "./env.js";

const validPublic = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: "https://exemplo.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
};

const validServer = {
  SUPABASE_SECRET_KEY: "sb_secret_teste",
  GOOGLE_GENERATIVE_AI_API_KEY: "chave-teste",
  TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
};

describe("parsePublicEnv", () => {
  it("aceita configuração válida", () => {
    expect(parsePublicEnv(validPublic)).toEqual(validPublic);
  });

  it("aponta a variável inválida sem mostrar o valor", () => {
    const run = () => parsePublicEnv({ ...validPublic, NEXT_PUBLIC_SUPABASE_URL: "nao-e-url" });
    expect(run).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(run).not.toThrow(/nao-e-url/);
  });
});

describe("parseServerEnv", () => {
  it("aplica valores padrão e deixa o Groq opcional", () => {
    const env = parseServerEnv(validServer);
    expect(env.SUPABASE_STORAGE_BUCKET).toBe("fontes");
    expect(env.EMBEDDING_DIMENSIONS).toBe(768);
    expect(env.CHAT_RATE_LIMIT_PER_MINUTE).toBe(10);
    expect(env.GROQ_API_KEY).toBeUndefined();
  });

  it("trata string vazia como ausente", () => {
    expect(() => parseServerEnv({ ...validServer, SUPABASE_SECRET_KEY: "" })).toThrow(
      /SUPABASE_SECRET_KEY/,
    );
    expect(parseServerEnv({ ...validServer, GROQ_API_KEY: "" }).GROQ_API_KEY).toBeUndefined();
  });

  it("converte números e rejeita valores inválidos", () => {
    const env = parseServerEnv({ ...validServer, EMBEDDING_DIMENSIONS: "1536" });
    expect(env.EMBEDDING_DIMENSIONS).toBe(1536);
    expect(() => parseServerEnv({ ...validServer, EMBEDDING_DIMENSIONS: "-1" })).toThrow(
      /EMBEDDING_DIMENSIONS/,
    );
  });
});
