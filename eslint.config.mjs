// @ts-check
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    // Camada core: regras puras, sem I/O nem dependências de framework.
    files: ["src/core/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/services/*", "@/infra/*", "@/app/*", "@/lib/env*"],
              message: "src/core não pode depender de camadas externas.",
            },
            {
              group: ["next", "next/*", "react", "@supabase/*", "ai", "@ai-sdk/*", "node:*"],
              message: "src/core deve ser puro (sem I/O e sem frameworks).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/services/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/infra/*", "@/app/*"],
              message: "Serviços recebem adaptadores por parâmetro; não importe infra/app.",
            },
          ],
        },
      ],
    },
  },
  {
    // Configuração só via src/lib/env.js (validada com Zod).
    files: ["src/**/*.{js,jsx}"],
    ignores: ["src/lib/env.js"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Use getServerEnv()/getPublicEnv() de @/lib/env.",
        },
      ],
    },
  },
  // Desliga regras de estilo que conflitam com o Prettier (sempre por último).
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
