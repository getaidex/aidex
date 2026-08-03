# Adopting Aidex In An Existing Application

Most applications don't start with Aidex — they already have working AI
functionality, calling a vendor SDK directly, and want to move that behavior
behind Aidex without a rewrite. This guide describes the general pattern for
that migration, independent of which application or which vendor is
involved.

## Principles

- **Incremental, not a rewrite.** Replace one AI call site at a time, not
  the whole application at once. Each replaced call site should be
  independently verifiable before moving to the next.
- **Preserve behavior first, restructure later.** The goal of a migration
  is that existing functionality keeps working exactly as before — same
  prompts, same output shape, same error behavior from the caller's point of
  view — with Aidex now sitting underneath it. Improving on that behavior is
  a separate, later decision.
- **Business logic stays in the application.** Aidex takes over AI execution
  — provider selection, strategy dispatch, observability, error handling —
  never the application's own business logic, UI, authentication, or data
  model. What moves is only the "call an AI vendor and get a result" part.

## What moves into Aidex

- Provider selection and configuration (API keys, model choice)
- The AI call itself, via a `Strategy` calling `context.provider.generate()`
- Cost, token, and duration tracking
- Vendor error translation into a consistent error hierarchy

## What stays in the application

- UI and user workflows
- Authentication and authorization
- Persistence and data model
- Product-specific business logic

## A typical migration sequence

1. **Replace direct vendor SDK imports with Aidex, one call site at a time.**
   Each existing AI call site becomes a `Strategy` registered with an `Aidex`
   instance, with the application's existing surrounding code (UI, business
   logic) untouched.
2. **Verify parity before moving on.** For each replaced call site, confirm
   generated output is unchanged, error handling behaves the same way from
   the caller's perspective, and any timing- or cost-sensitive behavior
   (streaming, token tracking) still works as before.
3. **Remove the direct vendor SDK dependency once every call site is
   migrated.** The application should no longer import the vendor SDK
   directly anywhere — that import now lives only inside the provider
   package.

## Capture what's hard to generalize

During a real migration, note anything that felt awkward to fit into a
`Strategy`/`Provider`/`Plugin` shape. That friction is useful signal for
whether a future capability — a registry, a workflow abstraction, a shared
prompt store — is worth building generally, rather than a one-off worked
around inside a single application's strategy. Per the Golden Rule (see
[ADR-001](../decisions/ADR-001-kernel-philosophy.md)), a capability only
earns a place in the platform once more than one application needs it — a
single migration's friction is a data point, not by itself a justification.

## Success looks like

The application's existing functionality behaves identically, every AI
request now flows through Aidex, and the application no longer imports any
AI vendor SDK directly.
