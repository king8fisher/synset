import { defineConfig } from "tsup";

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
});
