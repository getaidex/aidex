import type { Options } from "tsup";

export const baseTsupConfig: Options = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  dts: false,
  sourcemap: true,
  clean: false,
  splitting: false,
  skipNodeModulesBundle: true,
};
