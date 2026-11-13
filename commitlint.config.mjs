// @ts-check
/** @type {import("@commitlint/types").UserConfig} */
const config = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Mensagens em pt-BR podem começar com nome próprio (ex.: "SEMA-MT").
    "subject-case": [0],
  },
};

export default config;
