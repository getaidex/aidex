# 05 — Provider Comparison

**Level 2 · Providers · Intermediate · ~10 min**

## What problem does this solve?
You want to know, concretely, how providers differ on the same
question — latency, cost, and the actual response — before picking one
for production.

## Why would I use this Aidex feature?
`@aidex/evaluation`'s `Evaluator.compare()` runs the same `BenchmarkCase`
shape against however many providers you give it and returns duration,
cost, and success-rate stats for each, uniformly. This example is
honest about a real constraint: Aidex ships only `GeminiProvider` and
`StubProvider` today, so it compares two Gemini configs (or two demo
stand-ins offline) plus a Stub baseline — the mechanics are exactly what
you'd reuse the day a second real vendor `Provider` exists.

## When should I use this in a real project?
Before locking in a model/config choice, or any time you need a
repeatable way to answer "did that prompt change make responses slower
or more expensive."

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to two demo-provider variants
  with simulated latency, so the comparison table still has something
  real to show)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples provider-comparison
```

## Expected output
```
No GEMINI_API_KEY found — comparing demo-provider variants (see source for why).

Question: In one sentence, what makes TypeScript different from JavaScript?

— demo-fast —
  success rate:   100%
  avg duration:   ~50 ms
  avg cost:       $0.000014
  response:       [demo-fast demo answer] TypeScript adds static types on top of JavaScript.

— demo-slow —
  success rate:   100%
  avg duration:   ~400 ms
  ...
```

## Concepts learned
- `Evaluator.compare()` and the `BenchmarkCase` shape
- Cost estimation via `estimateTokens` + `pricing`
- Being honest in an example about what the SDK does and doesn't ship

## Related packages
`@aidex/evaluation`, `@aidex/providers`, `@aidex/sdk`

## Next example
[06 — Observability](../06-observability/README.md) — go deeper on
where those duration/token/cost numbers actually come from.
