# ADR-003: Admin is a composition layer, not a fourth state-owning package

- **Status:** Accepted
- **Date:** 2026-08-07

## Context

`@aidex/connections` (connection identity/config/enabled state) and
`@aidex/ai-control` (global/per-feature AI enable-disable) each already own
one slice of runtime state an admin surface would want to read and change.
`@aidex/observability` owns a third: the `ObservabilityBus` event timeline.

Building `@aidex/admin` raised the same question ADR-001 already answers
for the kernel: does this new package own anything, or does it only
compose what already exists? Without a durable answer, a future
contributor adding a feature to Admin could reasonably "fix" a perceived
gap by giving Admin its own connection store or its own feature-flag store
— duplicating state that already has a single source of truth, and
reintroducing exactly the divergence ADR-001's Golden Rule exists to
prevent.

## Decision

`@aidex/admin` is a **composition layer**: it owns no state of its own.

- `AdminController` is constructed with references to the application's
  existing `ConnectionManager`, `AIFeatureControl`, and (optionally)
  `ObservabilityBus` instances — the same instances the application already
  wired into `Aidex` itself.
- Every read (`getSnapshot()`) queries those instances directly at call
  time. Every command (`registerConnection()`, `setAIEnabled()`, etc.) is a
  thin, validated pass-through to the matching instance's own method.
  Admin does not reimplement connection storage, feature-flag storage, or
  event tracking.
- The one exception is `ObservabilitySummary.lastEventAt`: `ObservabilityEvent`
  carries no timestamp of its own, so `AdminController` tracks a single
  wall-clock scalar — "when did Admin last observe activity," sourced from
  `ObservabilityBus.subscribe()` (the bus's own existing pub/sub, not a
  second event bus). This is bookkeeping about Admin's own observation, not
  a parallel copy of `ObservabilityBus`'s event data.
- `AdminSnapshot` is an immutable, point-in-time, derived-only read.
  Because every field traces back to a source that is already safe to
  serialize (`Connection` has no `config` field; `AIControlState` has no
  provider knowledge; the observability summary is a pure numeric
  reduction), `AdminSnapshot` is safe to serialize by construction — Admin
  never writes its own secret-redaction logic.
- Dependency direction: `@aidex/admin → @aidex/connections /
  @aidex/ai-control / @aidex/observability → @aidex/core`. `@aidex/core`
  never depends on `@aidex/admin` — Admin is an application-composition
  concern, the same tier as `@aidex/sdk`, never a kernel one.

## Consequences

**Positive**

- One source of truth per state slice, always. A change made through
  `AdminController` and a change made by calling `ConnectionManager`/
  `AIFeatureControl` directly are the same change — there is no
  synchronization to get wrong, because there is nothing to synchronize.
- Future framework adapters (`@aidex/admin-react`, `-angular`, `-vue`) can
  render over `AdminController` with zero risk of drifting from the state
  `Aidex` itself is actually using, since it's the identical instance.
- `AdminSnapshot`'s safety is inherited, not implemented — Admin cannot
  introduce a secret leak that the composed packages don't already
  structurally prevent.

**Negative / accepted trade-offs**

- `AdminController` has no state of its own to persist, so it implies no
  persistence, multi-process, or multi-instance admin view — an
  application needing that builds it on top of `AdminController`, the same
  way `@aidex/connections`/`@aidex/ai-control` are themselves in-memory
  only today.
- Every `AdminController` command's error behavior is exactly its
  underlying package's error behavior (e.g. `ConnectionManager.enable()`'s
  `ConnectionNotFoundError` propagates untouched). Admin introduces its own
  error type only where it has a genuine invariant of its own (a missing
  required constructor dependency) — not as a general wrapping convention.

## Alternatives Considered

1. **Give `@aidex/admin` its own connection/feature-flag stores, synced
   from `@aidex/connections`/`@aidex/ai-control`.**
   Rejected — two stores for one concept is exactly the divergence risk
   ADR-001's Golden Rule was written to prevent, and there is no
   requirement today that justifies it.

2. **Split into `@aidex/admin-core` + `@aidex/admin` now, ahead of any UI
   adapter.**
   Rejected — `@aidex/connections`, `@aidex/ai-control`, and
   `@aidex/observability` already are the "core" logic Admin composes; a
   further split has no second consumer yet to justify it. Revisit if a
   concrete future adapter shows real reuse pressure the single package
   can't serve.

## References

**Related ADR:** [ADR-001](./ADR-001-kernel-philosophy.md) (Golden Rule this decision applies to Admin)

**Related files:** `packages/admin/src/AdminController.ts`, `packages/admin/src/types/AdminSnapshot.ts`
