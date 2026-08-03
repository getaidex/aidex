# @aidex/observability

## Installation

```sh
pnpm add @aidex/observability
```

```sh
npm install @aidex/observability
```

Reusable observability utilities for Aidex: measuring execution duration,
collecting an ordered event timeline, estimating token cost, and logging a
strategy's start/finish safely. **This package is not a Plugin** — it has no
dependency on `Plugin`, `Lifecycle`, or `Aidex` at all. It is meant to be
*consumed by* a future observability `Plugin` (in `@aidex/plugins`), which would
compose these primitives around the `beforeExecute`/`afterExecute` hooks.

## Contents

- **`metrics/ExecutionMetrics`** — pure duration calculation: `recordStart()`,
  `recordEnd()`, `getDuration()`. No logging, no persistence, no timestamp
  generated unless the caller omits one.
- **`timeline/Timeline`** — an ordered, caller-driven event collector. Never
  generates its own timestamp; only preserves insertion order for whatever
  `ObservabilityEvent`s the caller records (e.g. `started`, `provider-called`,
  `provider-returned`, `strategy-finished`).
- **`cost/CostEstimator`** (`estimateCost`) — pure math over
  `{ inputTokens, outputTokens, inputPricePerMillion, outputPricePerMillion }`.
  No hardcoded vendor pricing table of any kind — the caller supplies prices.
- **`logger/ExecutionLogger`** — a thin, safe `ILogger` wrapper for a
  strategy's start/finish. Never throws, even if the supplied logger itself
  throws or is `undefined`.
- **`types/ObservabilityEvent`** — the shared event shape (`{ event, metadata?
  }`) `Timeline` records. Deliberately generic — no provider, vendor, or
  application field of any kind.
- **`bus/ObservabilityBus`** — the unified event system: `subscribe(handler)`
  (returns an unsubscribe function) / `emit(event)`, backed by a `Timeline`
  for ordered history (`getTimeline()`). Eight named `track*()` convenience
  methods cover every signal this package tracks — `trackTokens`,
  `trackCost`, `trackDuration`, `trackProvider`, `trackEngine`,
  `trackWorkflow`, `trackError`, `trackRetry` — each just `emit()`ing a
  well-known event name (`ObservabilityEventName`) with caller-supplied
  metadata. `trackCostFromEstimate()`/`trackDurationFromMetrics()` tie the
  bus to the existing `estimateCost()`/`ExecutionMetrics` rather than
  duplicating their math.

## Independence

This package knows nothing about Gemini, OpenAI, Claude, Ollama, Design Platform,
Print Platform, or any other application or vendor. It only observes execution in the
abstract — durations, ordered events, token-based cost math, and log lines —
and every one of those inputs is supplied by the caller.

## Architecture rules this package follows

- Composition only — no inheritance, no abstract base class, no class
  hierarchy anywhere in this package.
- No singletons, no global mutable state — every class is instantiated by its
  caller and holds only its own instance state.
- Pure functions where state isn't needed (`estimateCost`); small focused
  classes where it is (`ExecutionMetrics`, `Timeline`, `ExecutionLogger`).
- `src/index.ts` exports the public utilities and their I/O types only.

## Dependency direction

`@aidex/observability` depends on `@aidex/core` only (for `ILogger`). It does not
depend on, and must never depend on, `@aidex/providers`, `@aidex/strategies`,
`@aidex/plugins`, or any future `workflow`/`memory`/`sdk` package.
