# 06 — Observability

**Level 2 · Providers · Intermediate · ~10 min**

## What problem does this solve?
You need to know, per call, how long a request took, how many tokens
it used, and what it cost — not after the fact from a vendor dashboard,
but inline, in your own logs/metrics pipeline.

## Why would I use this Aidex feature?
`ObservabilityBus` is a plain event bus: `subscribe()` to see everything
that happens. `GeminiProvider` auto-emits `provider`/`duration`/`tokens`/
`cost` events on every `generate()` call when constructed with
`{observability, pricing}` — no manual instrumentation code needed in
your application logic. Providers that aren't wired for this (like
`StubProvider`, which makes no real network call) can still be tracked
manually with the exact same event shape, shown here for symmetry.

## When should I use this in a real project?
Any production Aidex integration where you need cost/latency visibility
— feed `bus.subscribe()` into your existing logger, metrics exporter, or
tracing system.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to manual instrumentation over
  `StubProvider` — both paths are shown in the same file)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples observability
```

## Expected output
A stream of `[event] ...` lines as they're emitted, then the response,
then the full recorded timeline. Event `type`s include `provider`,
`duration`, `tokens` (Gemini only), and `cost`.

## Concepts learned
- `ObservabilityBus.subscribe()` for real-time event streaming
- Automatic instrumentation (`GeminiProvider` + `observability`/`pricing`
  config) vs. manual instrumentation (`ExecutionMetrics`, `trackProvider`,
  `trackDurationFromMetrics`, `trackCostFromEstimate`)
- `bus.getTimeline()` for a full post-hoc record

## Related packages
`@aidex/observability`, `@aidex/providers`, `@aidex/sdk`

## Next example
[07 — Document Intelligence](../07-document-intelligence/README.md) —
your first domain feature package, built on everything so far.
