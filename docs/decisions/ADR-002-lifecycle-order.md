# ADR-002: Lifecycle Initialization Order

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

During Phase 0 documentation and architecture review, we discovered that plugins
supplied through `AidexConfig.plugins` are registered *after* the Kernel enters the
`boot` lifecycle phase.

This means plugins cannot observe the `boot` event. The original documentation
incorrectly implied that `onBoot()` would execute for configured plugins — this was
caught during documentation review and corrected across every architecture doc that
touches the lifecycle (`docs/architecture/public-api.md`,
`docs/architecture/request-lifecycle.md`, `docs/architecture/plugin-development-guide.md`).
This ADR records that correction as a durable decision, not just a documentation fix.

## Decision

The Kernel lifecycle order is:

```
Kernel Construction
      ↓
     boot
      ↓
Plugin Registration
      ↓
    ready
      ↓
 execute(request)
      ↓
 beforeExecute
      ↓
 afterExecute
      ↓
   shutdown   (reserved for future implementation — not currently emitted)
```

Only the Kernel itself participates in `boot`. Plugins begin participating from
`ready` onwards.

`shutdown` is shown in the diagram above to give the full, five-phase picture of
`LifecyclePhase`, but it is reserved for future implementation and is not
currently emitted: no public `Aidex` method calls
`lifecycle.emit('shutdown', ...)` anywhere in this skeleton (confirmed by
`grep` over non-test source; see `docs/architecture/request-lifecycle.md`,
"`shutdown` is reserved, not wired"). Read the diagram as the full ordered set
of phases the `Lifecycle` type knows about, not as a claim that every step
after `afterExecute` fires automatically today.

`ExecutionContext.request` remains optional because no request exists during `boot`
or `ready`.

## Consequences

- Plugins never receive `boot`.
- Plugins receive `ready` as their first lifecycle event.
- No artificial request object is created during initialization.
- Kernel startup remains deterministic and predictable.
- Lifecycle documentation must reflect this behavior.
- `shutdown` remains reserved for future implementation and is not currently
  emitted by any public `Aidex` method.

## Alternatives Considered

1. **Register plugins before `boot`.**
   Rejected because kernel initialization should complete before external extensions
   execute.

2. **Create a fake request object during `boot`.**
   Rejected because it introduces invalid runtime state.

## Rationale

Keeping `boot` internal to the Kernel preserves a clean initialization sequence and
avoids exposing partially initialized state to plugins.

## References

**Architecture doc:** `docs/architecture/request-lifecycle.md`

**Related files:** `Lifecycle.ts`, `Plugin.ts`, `ExecutionContext.ts`
