import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const { version } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
    mcp: "src/mcp.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  splitting: true,
  sourcemap: true,
  // Unminified on purpose: the published tarball excludes sourcemaps, so
  // user-reported stack traces must be readable as-is. A CLI gains nothing
  // from minification.
  minify: false,
  clean: true,
  target: "node20",
  shims: true,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(version),
  },
});
