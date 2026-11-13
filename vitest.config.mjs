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
    passWithNoTests: true,
  },
});
