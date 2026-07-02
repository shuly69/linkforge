import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Emitted as index.js (esm) and index.cjs (cjs).
  outExtension: ({ format }) => ({ js: format === "cjs" ? ".cjs" : ".js" }),
});
