// @ts-check
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.js", "tests/unit/**/*.test.js"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/core/**/*.js", "src/services/**/*.js", "src/lib/**/*.js"],
      exclude: ["**/*.test.js"],
      thresholds: { "src/core/**": { lines: 80, functions: 80, branches: 80, statements: 80 } },
    },
  },
});
