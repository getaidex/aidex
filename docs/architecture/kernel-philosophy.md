# Kernel Philosophy

Aidex is the orchestration core that will power Print Platform, Design Platform,
and every AI-driven application that comes after them. Before any line of
kernel code is written, this
document fixes the *why*: what Aidex refuses to be, what it commits to being, the one
rule that governs every future decision about what belongs inside it, the division of
responsibility between the four layers of the system, and the reason its public API is
built to survive two years of change without breaking.

Everything else in the `docs/architecture/` series — project structure, public API,
request lifecycle, strategy and provider guides, design principles — is downstream of
this document. When a future contributor (including a future version of the team) is
unsure whether something belongs in Aidex, the answer should be derivable from what
follows.

## What Aidex Is Not

Aidex deliberately resembles several familiar categories of software without being any
of them. Naming the resemblance — and rejecting it — is the first act of discipline.

- **A framework.** It's tempting to call Aidex a framework because it defines
  interfaces (`Strategy`, `Provider`, `Plugin`) that application code implements and
  plugs into, which is exactly what frameworks do. It isn't one, because a framework
  owns control flow and dictates how an application is structured top to bottom; Aidex
  owns only the narrow act of routing a request to a strategy and returns control to
  the caller immediately after — it never dictates how Print Platform or Design Platform organize
  themselves.

- **An SDK.** It's tempting to call Aidex an SDK because it ships a small set of
  classes and types (`Aidex`, `AidexRequest`, `AidexConfig`) that look like a client
  library wrapping an external service. It isn't one, because an SDK exists to talk to
  *someone else's* product; Aidex has no product behind it — it is the product, and it
  talks to whatever provider the host application injects.

- **An application.** It's tempting to call Aidex an application because it has a
  lifecycle (boot, ready, beforeExecute/afterExecute, shutdown) the way a running
  program does. It isn't
  one, because an application has business logic, users, and a purpose of its own;
  Aidex has zero business logic and no opinion about what it's being used for — it is
  inert until an application gives it strategies and a provider to run.

- **A backend.** It's tempting to call Aidex a backend because it "executes" requests
  and produces responses, the same shape as a server handling an HTTP call. It isn't
  one, because a backend owns persistence, networking, and state on behalf of a
  client; Aidex owns none of that — it has no database, no network listener, and no
  concept of a client, only an in-process call stack.

- **An API server.** It's tempting to call Aidex an API server because `execute()`
  looks like an endpoint: input in, response out. It isn't one, because an API server
  is a network boundary with routes, auth, and a wire protocol; Aidex is a library
  loaded directly into an application's process — there is no network hop, and no
  request ever crosses a boundary Aidex controls.

Every one of these labels is attractive because Aidex borrows a *feature* of that
category. What keeps Aidex from becoming any of them is that it refuses the
*responsibility* that would come with the label — persistence, control flow, business
logic, network ownership, product identity. Take away the responsibility and the
resemblance is coincidental.

## What Aidex Is

Aidex is an **AI Kernel**.

A kernel is the smallest core a system can be built on: it doesn't know what the
applications above it are for, and it doesn't need to. Applications depend on Aidex —
they import it, configure it, register their own strategies against it, and call
`execute()`. Aidex depends on nobody — it has no reference to Print Platform, no reference to
Design Platform, no reference to any future application, and no reference to any specific AI
provider baked into its source. The dependency arrow points one way, always: outward
from the application, inward to the kernel, never back.

This is what makes Aidex reusable across unrelated products. Print Platform and Design Platform can
evolve independently, ship independently, and even disagree with each other about how
AI should behave in their domains — because none of that disagreement is encoded in
the kernel. The kernel only knows how to register a strategy, hold a provider, run a
lifecycle, and route a request. Everything that makes an application's AI behavior
*that application's* lives in the strategies and providers the application supplies,
never in Aidex itself.

## The Golden Rule

> *"If a feature is required by only one application, it does not belong inside
> Aidex."*

This is the single test every proposed kernel feature must pass, and it is deliberately
strict: "useful to one application" is not enough to justify inclusion — the bar is
"required by more than one," and even that is necessary but not sufficient, since
kernel scope stays minimal on top of it.

**Concrete example — rejected:** Print Platform needs to scope AI requests to a specific
storefront, so someone proposes adding a `shopId?: string` field to `AidexConfig`. It
would be convenient — Print Platform gets first-class support for the concept it cares about
most, right in the kernel's own configuration type. It is rejected anyway, because
`shopId` means nothing to Design Platform, means nothing to any future application, and
encodes a Print Platform business concept (a shop) directly into kernel configuration. The
correct home for `shopId` is Print Platform's own `AidexConfig.metadata`, or a field on the
`context` object a Print Platform-authored `Strategy` reads — both of which are extension
points Aidex already provides *without* the kernel having to know what a "shop" is.
Anything that starts to encode what one specific application means by its data is a
signal to push it out of the kernel and into that application's strategies, plugins,
or metadata.

The Golden Rule is what keeps Aidex's public surface small permanently, not just at
launch. Every future request to "just add one field" for one app's convenience gets
measured against it.

## Applications Decide. Kernel Executes. Strategies Orchestrate. Providers Generate.

This sentence is the division of labor for the entire system, and every clause draws
a boundary the others don't cross.

- **Applications decide.** Print Platform and Design Platform choose which strategies exist, which
  provider is wired up, what a request means, and when to call `execute()` — all
  product and business judgment lives here, entirely outside the kernel.

- **Kernel executes.** Aidex's job is mechanical: look up the strategy named in the
  request, run the lifecycle hooks around the call, and hand back whatever the
  strategy returns — it never inspects *what* a request is trying to accomplish.

- **Strategies orchestrate.** A `Strategy` is where the actual AI workflow for a
  given task lives — building a prompt, deciding whether to call a provider once or
  several times, and shaping the raw response into a result the application can use.

- **Providers generate.** A `Provider` does exactly one thing — turn a `Prompt` into
  a `ProviderResponse` by calling out to a specific model (Gemini today, others
  later) — with no awareness of strategy logic, request routing, or what the caller
  intends to do with the output.

Read top to bottom, this is also a chain of decreasing knowledge: applications know
everything about their own purpose; the kernel knows only how to dispatch; strategies
know how to accomplish one task; providers know only how to talk to one model. No
layer reaches past its neighbor, which is precisely what lets any layer be replaced —
a new provider, a new strategy, even a new application — without the others noticing.

## Why Kernel Stability Is the Top Design Goal

An AI kernel meant to sit underneath multiple independent applications for years has
exactly one thing it cannot afford to do casually: break its public API. Every
application built against `execute(request)` today is a future migration cost the day
that signature changes. Kernel stability is therefore not one goal among several — it
is the constraint every other design choice in Aidex is subordinate to.

The test is a two-year thought experiment: what needs will exist for `execute()` that
don't exist yet? A per-request timeout. Overriding the model for one call without
reconfiguring the whole kernel. Toggling streaming. Turning on debug output. Attaching
tracing metadata. Passing a cancellation signal. None of these are hypothetical — they
are the ordinary evolution of any request-execution surface — and none of them are
things Aidex can predict the full, final list of today.

This is exactly why `execute(request)` takes a single extensible object instead of a
list of positional arguments. A function signature like
`execute(strategy, input, timeout, stream, signal, …)` has to be rewritten, and every
caller updated, every time a new capability is added — that is a breaking change by
construction. A single object with an `options` field that itself stays open
(`AidexOptions` includes `timeout`, `signal`, `stream`, `debug`, and an index signature
for anything not yet named) lets the kernel grow new capabilities by adding optional
properties, which existing callers can simply ignore. The shape of `execute()` is
locked forever; what request objects are allowed to carry is free to grow. That
asymmetry — a frozen call surface wrapped around an extensible payload — is the whole
mechanism by which Aidex can absorb two years of unknown requirements without ever
asking Print Platform, Design Platform, or any future application to change how they call it.
