import type { Options } from "tsup";

export const baseTsupConfig: Options = {
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "es2022",
  // tsc -b (run before tsup, see each package's "build" script) still does
  // the real project-reference typecheck. tsup's own dts bundling is what
  // actually produces the published declarations: with both esm and cjs
  // formats requested, it rolls each up into a single self-contained file
  // per format — dist/index.d.ts (ESM) and dist/index.d.cts (CJS) — with no
  // relative cross-file imports left inside. That matters because a plain
  // copy of tsc's barrel index.d.ts (which still re-exports from sibling
  // ./kernel/*.js, ./types/*.js, etc.) fails under require() + Node16/
  // NodeNext: those siblings are still ESM-implied by "type": "module", so
  // TS1479 fires on every nested import, not just the entry point.
  dts: { compilerOptions: { composite: false, incremental: false } },
  sourcemap: true,
  clean: false,
  splitting: false,
  skipNodeModulesBundle: true,
};
