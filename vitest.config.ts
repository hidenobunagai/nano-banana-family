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
        // Measured under vitest 4.1.11 with the image API route handlers
        // included: 87.44 stmts / 77.58 branch / 83.77 funcs / 89.03 lines.
        // Each threshold sits 1-2 points below the measurement so unrelated
        // changes do not trip CI, while a real drop still does.
        lines: 88,
        functions: 82,
        branches: 76,
        statements: 86,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        // src/app is page, layout and platform glue that is measured through
        // its components. The image API route handlers carry the request
        // handling logic, so they stay measured. A negated pattern such as
        // "!src/app/api/**/route.ts" empties the whole report in vitest 4, so
        // the non-API parts are listed explicitly instead.
        "src/app/**/*.tsx",
        "src/app/*.ts",
        "src/app/{about,privacy,terms,serwist}/**",
        "src/app/api/auth/**",
        "src/**/*.test.{ts,tsx}",
        "node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
