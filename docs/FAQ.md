# FAQ

## What is Aidex?

A modular, provider-agnostic AI application platform. A small, frozen
kernel (`@aidex/core`) at the center — dispatch, lifecycle, and a handful of
type contracts, nothing else — with independent packages built around it:
concrete providers, strategies, plugins, an engine registry, a prompt
registry, a tool registry, workflow orchestration, a memory store,
observability, an evaluation framework, a developer-facing SDK, framework
adapters, and a CLI.

## Is Aidex production-ready?

Not yet. The kernel is stable and every package listed in the README is
real, tested code — not a roadmap item — but the platform is pre-1.0 and its
APIs may still change before a `1.0.0` release. See [Status](../README.md#status)
and the [roadmap](roadmap/roadmap.md).

## Why not just use LangChain / LlamaIndex / the Vercel AI SDK?

Different design center. Those are primarily *application* frameworks —
they ship prompt chains, agents, and retrieval patterns as part of the
library. Aidex's kernel deliberately ships none of that: `@aidex/core` has
zero business logic and zero AI-vendor code, by design (see
[ADR-001](decisions/ADR-001-kernel-philosophy.md)'s Golden Rule — *"if a
feature is required by only one application, it does not belong inside
Aidex."*). Strategies, providers, and plugins are supplied by you, or by one
of Aidex's own optional packages (`@aidex/strategies`, `@aidex/providers`) —
never baked into the kernel itself. If you want an opinionated, batteries-
included framework, those projects may be a better fit; if you want a small,
stable core you compose your own AI stack on top of, that's what Aidex is
for.

## Which AI providers does Aidex support?

`@aidex/providers` ships a real `GeminiProvider` (Google Gemini, via
`@google/genai`) today. The `Provider` interface is two members —
`{ name, generate(prompt, options?) }` — so adding a new provider (OpenAI,
Claude, Ollama, a local model) means implementing that interface, not
waiting on or patching the kernel. See
[`docs/architecture/provider-development-guide.md`](architecture/provider-development-guide.md)
and the `02-custom-provider` example in [`examples/`](../examples/).

## Can I use more than one provider at once?

Within one `Aidex` instance, no — `AidexConfig.provider` is exactly one
`Provider`, injected once, for that instance's lifetime, by design (no
runtime provider switching or fallback inside the kernel — see
[ADR-001](decisions/ADR-001-kernel-philosophy.md)). If your application
genuinely needs two providers — a primary and a fallback, or one per task —
construct two `Aidex` instances (or two `AIBuilder`-built `AI` façades) and
route between them yourself. This is a deliberate, settled design decision,
not a current limitation waiting to be fixed.

## How do I add a new capability — a new AI feature, a new tool, a new prompt?

Depends what you're adding:

- **A new way to talk to an AI backend** → a `Provider` implementation.
- **A new AI task** (summarize, extract, generate an image) → a `Strategy`
  implementation, registered by name.
- **A cross-cutting concern** (logging, metrics, rate limiting) → a
  `Plugin`, or an `ExtendedPlugin` via `@aidex/plugins`' `PluginManager` if it
  also needs to register Engines/Prompts/Tools.
- **A reusable, permission-gated capability** → a `Tool`, registered into a
  `ToolRegistry` (`@aidex/tools`).
- **A reusable prompt template with variables** → a `PromptTemplate`,
  registered into a `PromptRegistry` (`@aidex/prompts`).

None of these require a change to `packages/core`. See each package's own
README for the exact contract.

## Why is the kernel's public API only four methods?

`new Aidex(config)`, `.use(plugin)`, `.registerStrategy(strategy)`,
`.execute(request)` — and nothing else, on purpose. A public surface that
never grows keeps every application built on this kernel safe from breaking
changes indefinitely; growth happens by adding optional fields to the
request payload, never by adding a fifth method. See
[`docs/architecture/public-api.md`](architecture/public-api.md) and
[`docs/architecture/design-principles.md`](architecture/design-principles.md)
for the full reasoning.

## Do I have to use `@aidex/sdk`, or can I use `@aidex/core` directly?

Either works — the SDK is a convenience façade, not a requirement.
`AIBuilder`/`AI` (from `@aidex/sdk`) exist because using the kernel directly
means knowing about providers, strategies, and plugins as separate concepts
before generating one line of text; the SDK hides that assembly. Advanced
use cases that need direct access to lifecycle hooks, multiple strategies,
or the `PluginManager`'s extension registries can construct `Aidex` from
`@aidex/core` directly — several of this repo's own [`examples/`](../examples/)
do exactly that where the SDK doesn't (yet) have a façade for something
(see `examples/README.md`, "Limitations discovered").

## Where do I ask questions vs. file a bug?

Both go through [GitHub Issues](https://github.com/getaidex/aidex/issues) —
the bug report template for bugs, the feature request template for ideas,
"how do I…" questions, and concrete, actionable feature requests. Security
vulnerabilities go through [SECURITY.md](../SECURITY.md), never a public
issue.
