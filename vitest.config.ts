import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
    passWithNoTests: false,
    // "server-only" é um stub do Next.js que não existe como pacote real;
    // em testes (Vitest/Node puro) precisamos de um módulo vazio no lugar.
    server: {
      deps: {
        inline: ["server-only"],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Stub para "server-only" no ambiente de testes: módulo vazio.
      "server-only": fileURLToPath(new URL("./src/__test-stubs__/server-only.ts", import.meta.url)),
    },
  },
});
