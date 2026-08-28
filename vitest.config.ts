import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // Only pure entry shims (process.exit bootstraps) and type-only schema
      // files are excluded; all logic files count, including the CLI and the
      // HTTP layer.
      exclude: ["src/cli.ts", "src/mcp.ts", "src/index.ts", "src/**/schema.ts"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50,
      },
    },
  },
});
