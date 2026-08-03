# ADR-001: Aidex is a kernel, not a framework or SDK

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

Print Platform, Design Platform, and every AI-driven application that follows them each need AI
orchestration — routing a request to the right workflow, calling a model provider,
and shaping the result. The fork in the road was whether each application builds and
maintains that orchestration capability separately, or whether it lives once as a
shared dependency that every application imports.

Building it per-application means duplicated orchestration logic, divergent APIs
across products, and no single place to fix a bug or add a capability once for
everyone. Building it shared only works if the shared core stays small enough that
Print Platform and Design Platform can each evolve independently without either one distorting it to
fit the other's needs. `docs/architecture/kernel-philosophy.md` fixes the governing
test for that scope, the Golden Rule:

> *"If a feature is required by only one application, it does not belong inside
> Aidex."*

## Decision

Build Aidex as an **AI kernel**: the smallest core the applications above it can be
built on, owning orchestration and nothing else.

- A frozen four-method public API — `new Aidex(config)`, `use()`,
  `registerStrategy()`, `execute()` — is the entire surface applications call.
- Aidex owns dispatch only: look up the strategy named in a request, run lifecycle
  hooks, and return whatever the strategy produces. It owns no transport, no
  storage/persistence, no UI, and no app-specific concerns.
- Providers, strategies, and plugins are supplied by applications at configuration
  time, not owned or shipped by the kernel. Aidex has no reference to Print Platform, no
  reference to Design Platform, and no reference to any specific AI provider baked into its
  source — the dependency arrow points one way, outward from application to kernel.
- Every proposed kernel feature is measured against the Golden Rule before it is
  added; "useful to one application" is not sufficient grounds for inclusion.

## Consequences

**Positive**

- Print Platform, Design Platform, and future applications share one orchestration core instead of
  reimplementing it, while still shipping and evolving independently.
- Swapping a provider or adding a new strategy is application-level work; it never
  requires a kernel change or a kernel release.
- The four-method public API can stay stable for years, because request-level growth
  happens inside the extensible `AidexRequest` / `AidexOptions` payload, not by adding
  new methods or positional arguments to the call surface.

**Negative / accepted trade-offs**

- No built-in provider registry: an application picks exactly one provider at
  construction time, not a runtime-switchable set the kernel manages.
- No built-in retry, streaming, tracing, or similar cross-cutting behavior yet.
  Capabilities like these must be added as fields on `AidexRequest` / `AidexOptions`
  rather than as new public methods, or they don't belong in the kernel at all.
- This rigidity is deliberate, but it is also a bet: some future requirement may not
  fit inside the existing extensibility points. If that happens, the correct response
  is a new ADR that supersedes or amends this one, filed under `docs/decisions/`,
  rather than a quiet erosion of the Golden Rule.
