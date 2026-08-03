# Guides

Practical, task-oriented documentation for working with Aidex in a real
codebase — as opposed to [`docs/architecture/`](../architecture/), which
explains why the kernel is designed the way it is. Guides assume the
architecture docs as background and focus on what to actually do.

## Current guides

- [`provider-integration.md`](provider-integration.md) — what a real,
  production-grade `Provider` implementation adds beyond the bare interface:
  authentication, request/response mapping, error translation, observability
  wiring, and how to test one.
- [`platform-adoption.md`](platform-adoption.md) — the general pattern for
  adopting Aidex inside an application that already has AI functionality
  calling a vendor SDK directly, without a rewrite.

These are practical integration guides: each one walks through a concrete
task — integrating a provider, adopting Aidex in an existing application —
rather than explaining a design decision. Reach for `docs/architecture/`
first to understand a concept, and for a guide here once you're ready to
build something with it.
