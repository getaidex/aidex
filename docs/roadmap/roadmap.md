# Aidex Roadmap

This document records direction, not commitments. It exists to answer one
question: given what's built (see the [CHANGELOG](../../CHANGELOG.md) for
the authoritative list), what direction could Aidex grow in next, and what
would deliberately stay out of the kernel while it grows. Nothing here
overrides `packages/core`'s frozen public API; if the two ever disagree, the
frozen kernel wins and this document is stale.

## What v1 (this plan) actually shipped

The original v1 scope — the kernel skeleton — is done: `Aidex` class,
`registerStrategy()`, `use()`, `execute()`, the five lifecycle phases, the
two kernel error types, and the shared type contracts in `packages/core/src/types/`,
with zero business logic and zero AI implementation inside `packages/core`
itself. Frozen and stable.

Beyond that original scope, fourteen more packages have since been built —
not as a future plan, but as real, tested, working code:

- **Providers & Strategies**: `@aidex/providers` (`StubProvider`,
  `GeminiProvider` with real `@google/genai` integration, error translation,
  and observability wiring), `@aidex/strategies` (`TextGenerationStrategy`).
- **Plugin System**: `@aidex/plugins`' `PluginManager`, extending plugins
  beyond lifecycle hooks to also register Engines, Strategies, Prompts, and
  Tools.
- **Engines, Prompts, Tools**: `@aidex/engines` (`EngineRegistry`),
  `@aidex/prompts` (`PromptRegistry`, versioned, with variable substitution),
  `@aidex/tools` (`ToolRegistry`, permission-gated).
- **Workflow & Memory**: `@aidex/workflow` (sequential multi-step execution,
  cancellation, event stream) and `@aidex/memory` (generic key/value store) —
  both fully standalone.
- **Observability & Evaluation**: `@aidex/observability` (`ObservabilityBus`
  unifying token/cost/duration/provider/error tracking) and
  `@aidex/evaluation` (benchmark and compare providers/strategies).
- **Developer-facing surfaces**: `@aidex/sdk` (`AI`/`AIBuilder`, the primary
  entry point), `@aidex/adapters` (Express/Node), `@aidex/cli`.

See each package's own `README.md` for what it actually does; see the
[CHANGELOG](../../CHANGELOG.md) for the full, dated list.

## What's next — real candidates, not yet built

Everything below is a direction, not a commitment. None of it has a task
breakdown, an owner, or a target date.

- **Additional providers** — `OpenAIProvider`, `ClaudeProvider`,
  `OllamaProvider`, each implementing `@aidex/core`'s `Provider` interface
  the same way `GeminiProvider` does. No kernel change required; this is
  purely additive work in `@aidex/providers` (or a new package).
- **`PluginManager` support in `@aidex/sdk`** — `AIBuilder`/`AI` currently
  have no façade over `PluginManager`; using it means constructing a raw
  `Aidex` instance directly (see `examples/README.md`, "Limitations
  discovered"). A future SDK addition could close this gap without touching
  the kernel.
- **An `EngineRegistry` façade in the SDK** — same shape of gap: running an
  engine today means building an `ExecutionContext` by hand and calling
  `EngineRegistry.execute()` directly.
- **Streaming** — `AidexOptions.stream?: boolean` is reserved on the frozen
  type but not read anywhere. Real streaming needs `Provider` (and possibly
  `Strategy`) to support returning an async iterable instead of a single
  `ProviderResponse` — a real interface change, deserving its own ADR before
  any implementation.
- **MCP Server** — expose registered Strategies/Tools as Model Context
  Protocol tools, so MCP-speaking clients (agents, IDEs) can reach
  Aidex-backed capabilities through the standard MCP surface. `@aidex/tools`'
  `Tool.inputSchema` field already exists as forward-compatible plumbing for
  this; no MCP transport is implemented yet.
- **A Feature Pack layer** — reusable, higher-level AI capabilities
  (document analysis, content generation, etc.) composed from Strategies +
  Prompts + Tools + a Provider, published as their own packages on top of
  the platform rather than inside it. See [`docs/vision.md`](../vision.md) for
  the earlier product-vision thinking behind this direction.

## What deliberately stays out, and why

- **A Provider Manager / provider registry / runtime provider switching** —
  considered and explicitly rejected as a kernel feature. `AidexConfig.provider`
  is one `Provider` per `Aidex` instance, by design (see
  [ADR-001](../decisions/ADR-001-kernel-philosophy.md)). An application
  needing multiple providers constructs multiple `Aidex`/`AI` instances — an
  application-level composition, not a kernel capability. If this is ever
  revisited, it requires a new ADR superseding ADR-001, not a quiet
  addition.
- **Configuration loading, env-var parsing, secrets management inside the
  kernel** — `packages/core` never reads `process.env`; every value in
  `AidexConfig` is supplied by the caller. This stays that way.
- **A database, an HTTP server, or a UI inside the kernel** — application
  concerns, never kernel ones, per the Golden Rule
  (["if a feature is required by only one application, it does not belong
  inside Aidex"](../decisions/ADR-001-kernel-philosophy.md)).

## Status of this document

Nothing in "What's next" is scheduled, designed, or funded. Turning any item
here into real work requires its own design pass and explicit sign-off —
exactly as every package listed under "What v1 actually shipped" required
before it was built.
