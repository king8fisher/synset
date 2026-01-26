import { defineConfig } from "tsup";
import { copyFileSync } from "node:fs";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  target: "node18",
  shims: true,
  // Bundle xml-streamify since it exports TypeScript directly
  noExternal: ["@dbushell/xml-streamify"],
  // Keep bun:sqlite external (Bun runtime provides it)
  external: ["bun:sqlite"],
  onSuccess: async () => {
    // Copy schema.sql to dist for consumers
    copyFileSync("src/schema.sql", "dist/schema.sql");
  },
});
