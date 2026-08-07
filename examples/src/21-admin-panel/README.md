# 21 — Admin Panel

**Bonus · Package Coverage · Intermediate · ~10 min**

## What problem does this solve?
You've wired `@aidex/connections`, `@aidex/ai-control`, and
`@aidex/observability` into an application — now you want an actual UI
surface that reads and controls that state, without building a second
state store for it.

## Why would I use this Aidex feature?
`@aidex/admin`'s `AdminController` composes the same `ConnectionManager`/
`AIFeatureControl`/`ObservabilityBus` instances your application already
constructed — it owns none of that state itself. `@aidex/admin-react`'s
`useAdmin(controller)` hook then makes that composition reactive in React
with zero extra wiring. This example is the full chain end to end: the
same instances feed both `Aidex` (execution) and `AdminController`
(admin UI), so toggling AI off in the UI immediately blocks the next
`aidex.execute()` call — the provider is never reached.

## When should I use this in a real project?
Any application that wants an internal Admin surface — connection
health, an AI kill switch, per-feature flags, basic usage numbers —
without hand-rolling a second copy of state that's already tracked
elsewhere.

## Requirements
- Node ≥18, pnpm
- No API key — uses `StubProvider`, deterministic and offline.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples admin-panel
```

## Expected output
A narrated sequence: an initial snapshot, a successful run, AI disabled
via `AdminController` and the next execution rejected with
`AIDisabledError` before `StubProvider.generate()` is ever called,
AI re-enabled and a successful run again, then the same rejection shown
at the per-feature level while the global flag stays on.

## Test
The React UI itself (`AdminPanel.tsx`) is exercised by
`AdminPanel.test.ts` via `@testing-library/react` — the same flow this
README describes, but driven through actual DOM clicks on the AI
toggle, the feature toggle, and the Run button, asserting on rendered
text rather than calling `AdminController` methods directly.

```bash
pnpm vitest run examples/src/21-admin-panel
```

## Key files
- `setup.ts` — the composition every real application would write:
  `ConnectionManager` + `AIFeatureControl` + `ObservabilityBus` feeding
  both `Aidex` and `AdminController`.
- `AdminPanel.tsx` — the UI. All Admin state comes from
  `useAdmin(controller)`; the only local state is ephemeral (the input
  box, the last run's result/error).
- `index.ts` — a runnable narration of the same architecture without a
  browser.
