# @aidex/evaluation

## Installation

```sh
pnpm add @aidex/evaluation
```

```sh
npm install @aidex/evaluation
```

Benchmarks engines (or anything expressible as `() => Promise<TResult>`):
output quality, token usage, cost, latency, and success rate — and allows
comparing providers by running several named cases side by side.

## Contents

- **`types/BenchmarkCase`** — `{ name, execute(): Promise<TResult>,
  scoreOutput?(result), estimateTokens?(result) }`. `execute()` is
  deliberately generic — the Evaluator never imports `@aidex/engines`,
  `@aidex/providers`, or `@aidex/strategies`. A caller's closure is whatever it
  needs to be (an `Engine.execute(context)` call, an `AI.text()` call, a raw
  `Provider.generate()` call).
- **`evaluator/Evaluator`** — `run(case, options?)` executes a case
  `options.runs` times (default 1), catching failures rather than throwing
  out of `run()`, and returns a `BenchmarkSummary`. `compare(cases,
  options?)` runs several cases with the same options and returns one
  summary per case — **this is how you compare providers**: define one
  `BenchmarkCase` per provider/engine/strategy variant, each wrapping a call
  through that variant.
- **Tracked per run**: `durationMs` (via an injectable clock —
  `options.now`, defaulting to `Date.now`, for deterministic tests),
  `qualityScore` (via the case's own `scoreOutput()` — there is no automatic
  quality judge), `inputTokens`/`outputTokens` and `cost` (via the case's
  `estimateTokens()` plus `options.pricing`, reusing `@aidex/observability`'s
  `estimateCost()` rather than duplicating its math), and `success`/`error`.
- **Aggregated per case** (`BenchmarkSummary`): `successRate` (fraction of
  runs that didn't throw), `averageDurationMs`, `averageQualityScore`,
  `averageCost` — each `undefined` if no run produced that value (e.g. no
  `scoreOutput()` supplied, or every run failed).

## Dependency direction

`@aidex/evaluation` depends on `@aidex/observability` only (`estimateCost`,
`CostEstimate`, reused rather than reimplemented). No dependency on
`@aidex/core`, `@aidex/providers`, `@aidex/engines`, `@aidex/strategies`, or any
application code — a `BenchmarkCase`'s `execute()` closure is where any of
those would actually be used, entirely outside this package.
