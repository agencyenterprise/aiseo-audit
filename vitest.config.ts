import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli.ts",
        "src/index.ts",
        "src/utils/http.ts",
        "src/**/schema.ts",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50,
      },
    },
  },
});
