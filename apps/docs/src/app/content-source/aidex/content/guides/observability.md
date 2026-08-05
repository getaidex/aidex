# Observability

`@aidex/observability` is a set of reusable observability primitives:
measuring execution duration, collecting an ordered event timeline,
estimating token cost, and safely logging a strategy's start/finish. It is
**not a Plugin** — it has no dependency on `Plugin`, `Lifecycle`, or `Aidex`
at all. It's meant to be consumed by a plugin that composes these primitives
around `beforeExecute`/`afterExecute`.

## The unified event bus

`ObservabilityBus` is the piece most applications reach for directly:

```ts
import { ObservabilityBus } from '@aidex/observability';

const bus = new ObservabilityBus();

const unsubscribe = bus.subscribe((event) => {
  console.log(event.event, event.metadata);
});

bus.trackProvider({ name: 'gemini' });
bus.trackTokens({ inputTokens: 120, outputTokens: 48 });
bus.trackDuration({ durationMs: 340 });
```

Eight `track*()` convenience methods cover every signal this package knows
about — `trackTokens`, `trackCost`, `trackDuration`, `trackProvider`,
`trackEngine`, `trackWorkflow`, `trackError`, `trackRetry` — each just
`emit()`ing a well-known event name with the metadata you supply. `emit()`
is backed by a `Timeline` for ordered history, retrievable via
`bus.getTimeline()`.

## Cost estimation

`estimateCost()` is pure math over token counts and prices you supply —
there is no hardcoded vendor pricing table:

```ts
import { estimateCost } from '@aidex/observability';

const cost = estimateCost({
  inputTokens: 120,
  outputTokens: 48,
  inputPricePerMillion: 0.15,
  outputPricePerMillion: 0.6,
});
```

`bus.trackCostFromEstimate()` ties this straight into the bus instead of
you calling `estimateCost()` and `trackCost()` separately.

## Duration and logging

`ExecutionMetrics` gives you `recordStart()` / `recordEnd()` / `getDuration()`
for pure duration math with no logging or persistence attached.
`ExecutionLogger` is a thin, safe `ILogger` wrapper for a strategy's
start/finish — it never throws, even if the logger you gave it throws or is
`undefined`.

## Independence

This package knows nothing about Gemini, OpenAI, any other vendor, or any
specific application — every duration, event, and price it deals with is
supplied by the caller. It depends on `@aidex/core` only, for the `ILogger`
type.

See [06 — Observability](/examples/06-observability) for a full runnable
walkthrough covering both automatic and manual instrumentation.
