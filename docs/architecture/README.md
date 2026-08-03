# Architecture Documentation

This directory explains how Aidex's kernel (`@aidex/core`) is designed — the
philosophy behind it, the shape of its source tree, its four-method public
API, its request lifecycle, the contracts application code writes against
(`Strategy`, `Provider`, `Plugin`), and the design patterns underneath all of
it. Each document is a standalone reference; together they're the
authoritative account of why the kernel is built the way it is, not just
what its API surface looks like.

## Reading order

1. [`kernel-philosophy.md`](kernel-philosophy.md) — what Aidex is (and isn't),
   and the Golden Rule that governs every kernel design decision
2. [`project-structure.md`](project-structure.md) — the folder layout that
   makes that philosophy enforceable
3. [`public-api.md`](public-api.md) — the four public calls, in full
4. [`request-lifecycle.md`](request-lifecycle.md) — the five lifecycle
   phases and the full `execute()` flow
5. [`strategy-development-guide.md`](strategy-development-guide.md) — how to
   build a `Strategy`
6. [`provider-development-guide.md`](provider-development-guide.md) — how to
   build a `Provider`
7. [`plugin-development-guide.md`](plugin-development-guide.md) — how to
   build a `Plugin`
8. [`design-principles.md`](design-principles.md) — the design patterns
   (dependency inversion, Strategy pattern, Composition over Inheritance,
   Open-Closed) each prior document already embodies
9. [`architecture-faq.md`](architecture-faq.md) — a question-and-answer
   companion collecting the reasoning above into short, direct answers

Reading in order builds context progressively; each document after the
first assumes the ones before it. Jumping straight to whichever topic is
relevant also works — every document links back to the others it depends on.

## What you'll learn

By the end of this directory, you'll understand why Aidex is a minimal
kernel rather than a framework or an SDK, how its public API stays frozen
while still absorbing new capability over time, and where the boundary sits
between what the kernel owns and what every application built on top of it
owns instead.
