import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    env: {
      AUTH_SECRET: "test-secret-for-vitest",
      NEXTAUTH_SECRET: "test-secret-for-vitest",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        // Measured under vitest 4.1.11 (v8 + AST-aware remapping, on by default
        // since v4): 85.49 stmts / 75.48 branch / 79.84 funcs / 87.40 lines.
        // The old 90/80/65/90 assumed v3's less precise mapping of the same tests.
        lines: 87,
        functions: 79,
        branches: 75,
        statements: 85,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/app/**", "src/**/*.test.{ts,tsx}", "node_modules/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
