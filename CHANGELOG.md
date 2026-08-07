# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `@aidex/connections` — a standalone package for managing named
  AI-provider connection configurations (identity/config/enabled-state),
  resolved into `Provider` instances via application-registered
  `ProviderFactory` functions. Depends only on `@aidex/core`; lives
  entirely at the application-composition layer, the same relationship
  `@aidex/engines` has with the kernel, consistent with
  `ADR-001`'s one-`Provider`-per-`Aidex`-instance contract.
- `ConnectionManager`'s stored `config` (which may hold secrets) is
  reachable through exactly one method, `resolve()`: `get()`/`list()`
  return a `Connection` type with no `config` field at all, and the
  connection map itself is a true `#`-private class field, not just
  TypeScript `private` — so it can't leak via `console.log`/
  `util.inspect` on the manager instance either.

## [0.2.1-alpha] - 2026-08-04

### Changed

- Synchronized every package's version number — root `package.json` had
  drifted to `0.2.1-alpha` while all 22 published packages remained at
  `0.2.0-alpha`. This repo uses fixed/lockstep versioning; all 24
  `package.json` files (22 packages + 2 private apps) now match.
- Rewrote the root README's `## Status` and `## Installation` sections,
  which previously told visitors the project wasn't published to npm and
  pointed them at `git clone` + `file:` dependencies — both false as of
  `0.2.0-alpha`'s actual publish.
- Reworded `@aidex/cli`'s `package.json` description off "the first
  executable application" (it has no `bin` field — it's a
  command-dispatch class, not a terminal executable).
- Replaced the entire `examples/` folder: 8 API-demonstration scripts
  became a 15-example, 9-level learning-path course (Getting Started →
  Providers → Documents → Design → Marketing → Workflow → Plugins →
  Custom Engines → Capstone), plus a `BUILD-YOUR-FIRST-AIDEX-APP.md`
  tutorial and a rewritten `examples/README.md` portal. Every example
  runs with zero setup, falling back to a deterministic demo provider
  without a `GEMINI_API_KEY`.
- Added 5 more examples (`16`-`20`) covering the previously-uncovered
  `@aidex/adapters`, `@aidex/memory`, `@aidex/mcp`, `@aidex/mcp-aidex`,
  and `@aidex/cli` packages.

### Added

- A pnpm-only publish/install guard (`scripts/assert-pnpm.cjs`, wired
  into root `preinstall` and every package's `prepublishOnly` and
  `prepack`) — plain `npm publish`/`npm pack` previously shipped the
  literal, unresolved `"workspace:*"` string into published tarballs
  with no automated guard against it.
- A release CI workflow (`.github/workflows/release.yml`): a
  `pnpm -r publish --dry-run` check plus a version-independent
  `pnpm -r exec -- npm pack --dry-run` packaging check on every PR
  (the former only exercises packages whose version isn't already on
  npm, so the latter unconditionally packs every package regardless of
  its published-version state), and a real `pnpm -r publish` on `v*`
  tag pushes.
- A `LICENSE` file in every one of the 22 published packages (only the
  root `LICENSE` existed before — a standalone unpacked install shipped
  with no license text).
- CommonJS (`require()`) usage examples in the root README and
  `packages/sdk/README.md`, alongside the existing ESM ones — the dual
  ESM/CJS build support shipped in `0.2.0-alpha` had no corresponding
  CJS documentation until now.

## [0.2.0-alpha] - 2026-08-03

### Added

- **`@aidex/providers`** — a provider capability model: `ProviderCapability`,
  `ProviderCapabilities`, `createProviderCapabilities`, and
  `CapableProvider`. Both `StubProvider` and `GeminiProvider` now implement
  `CapableProvider` and expose `getCapabilities()`.

Twenty-one new packages built on top of the frozen `0.1.0-alpha` kernel. The
kernel itself (`packages/core`) is unchanged — every addition below composes
its public contracts rather than modifying them.

### Added — Providers, Strategies, Plugins

- **`@aidex/providers`** — `StubProvider` (deterministic reference
  implementation) and `GeminiProvider` (real `@google/genai` integration:
  request/response mapping, vendor-agnostic error translation —
  `ProviderAuthenticationError`/`ProviderRateLimitError`/
  `ProviderInvalidRequestError`/`ProviderUnavailableError`, abort/timeout
  support, optional `@aidex/observability` wiring for provider/duration/
  tokens/cost/error tracking).
- **`@aidex/strategies`** — `StubStrategy` (reference implementation) and
  `TextGenerationStrategy` (the first production strategy: prompt-in,
  text-out, provider-independent).
- **`@aidex/plugins`** — `StubPlugin`, `LoggerPlugin`, and the Aidex Plugin
  System's `PluginManager`: installs an `ExtendedPlugin` that can register
  Engines, Strategies, Prompts, and Tools in one call, each into its real,
  dedicated registry.

### Added — Engines, Prompts, Tools

- **`@aidex/engines`** — `Engine` contract (`id`/`name`/`description`/
  `version`/`execute(context)`) and `EngineRegistry` (register/discover/
  execute by id).
- **`@aidex/prompts`** — `PromptRegistry` (register, version, look up by id,
  render with `{{variable}}` substitution and validation).
- **`@aidex/tools`** — `ToolRegistry` (register, discover by id or required
  permission, execute with permission validation).

### Added — Workflow, Memory, Observability, Evaluation

- **`@aidex/workflow`** — `Workflow`/`WorkflowExecutor`: sequential
  multi-step execution over a shared context, cancellation via
  `AbortSignal`, and an observability event stream (`onEvent`). Fully
  standalone — no dependency on `@aidex/core`.
- **`@aidex/memory`** — a generic, synchronous key/value store (`Memory`,
  `MemoryStore`). Not AI chat memory, not a vector store. Fully standalone.
- **`@aidex/observability`** — `ExecutionMetrics`, `Timeline`,
  `estimateCost`, `ExecutionLogger`, and `ObservabilityBus` (a unified
  pub/sub event system tracking tokens, cost, duration, provider, engine,
  workflow, errors, and retries).
- **`@aidex/evaluation`** — `Evaluator`: benchmark any `() => Promise<T>`
  unit (quality, tokens, cost, latency, success rate) and compare multiple
  variants (e.g. providers) side by side.

### Added — Developer-facing surfaces

- **`@aidex/sdk`** — the primary developer entry point: `AI` (façade) and
  `AIBuilder` (`new AIBuilder().provider(p).build()`, auto-registering
  `TextGenerationStrategy`). Re-exports `Provider`/`Plugin` from
  `@aidex/core` so applications rarely need to import the kernel package
  directly.
- **`@aidex/adapters`** — `ExpressAdapter` and `NodeAdapter`, thin
  framework-integration wrappers around the SDK. No AI logic.
- **`@aidex/cli`** — `CLI`, a command-dispatch class built on the SDK
  (`text`/`version` commands, extensible via `register()`).
- **`examples/`** — eight short, independent, runnable programs
  demonstrating every package above through public APIs only.

### Added — MCP, Feature Packs, Catalog

- **`@aidex/mcp`** — a reusable Model Context Protocol server foundation:
  transport, and Tool/Resource/Prompt registries. No engine execution, no
  providers, no workflows.
- **`@aidex/mcp-aidex`** — the adapter layer between Aidex Engines and
  `@aidex/mcp` Tools. Any Engine becomes an MCP Tool with zero
  feature-pack-specific code. No protocol implementation, no providers, no
  AI execution.
- **`@aidex/catalog`** — a queryable, pure-metadata registry describing
  every Engine provided by installed Feature Packs (no provider logic, no
  execution logic).
- **`@aidex/document`** — the first Aidex Feature Pack: engine identifiers
  and typed request/response contracts for document intelligence
  (extraction, OCR, translation, summarization, resume analysis, invoice
  extraction, contract review).
- **`@aidex/design`** — an Aidex Feature Pack for creative design generation
  (layouts, brand identity, palettes, typography, posters, flyers, business
  cards, banners, logos, social posts, presentations, mockups, templates).
- **`@aidex/content`** — an Aidex Feature Pack for content generation and
  editing (generate, rewrite, expand, shorten, translate, summarize, tone,
  SEO, blog, email, social, product descriptions, headlines, taglines).
- **`@aidex/marketing`** — an Aidex Feature Pack for campaign planning, SEO,
  social media, email marketing, and marketing analytics.
- **`@aidex/media`** — an Aidex Feature Pack for image, video, and audio
  generation, editing, and transcription.

### Added — Consistency and hardening passes

- A vendor-agnostic `ProviderError` hierarchy and typed errors across
  `@aidex/cli` (`CommandNotFoundError`), `@aidex/sdk` (`MissingProviderError`),
  and `@aidex/strategies` (`InvalidStrategyInputError`) — replacing raw
  `new Error(...)` usage repo-wide with dedicated, `instanceof`-checkable
  classes, consistent with the kernel's own `StrategyNotFoundError`/
  `DuplicateRegistrationError` pattern.
- `packages/core/README.md` — the kernel's own package-level documentation
  (previously missing).
- A full architecture audit and remediation pass: package boundaries,
  public API surface review, dependency graph verification, and
  observability/error-handling consistency.

### Not included

No `OpenAIProvider`/`ClaudeProvider`/`OllamaProvider` yet (only Gemini). No
Provider Manager, provider fallback, or runtime provider switching — a
deliberate, settled kernel design decision (see
[ADR-001](docs/decisions/ADR-001-kernel-philosophy.md)), not a gap.

## [0.1.0-alpha] - 2026-07-25

The Aidex kernel skeleton: a working, tested, provider-agnostic AI orchestration
core with zero business logic and zero AI implementation. This release proves
the architecture — it does not ship any concrete provider, strategy, or plugin.

### Added

- **Public API** — `Aidex` class with exactly four public members:
  `new Aidex(config)`, `use(plugin)`, `registerStrategy(strategy)`,
  `execute(request)`. No other public method exists on `Aidex`, and no other
  export from `@aidex/core` bypasses this surface.
- **Type contracts** (`packages/core/src/types/`) — `Strategy`, `Provider`,
  `Plugin`, `ILogger`, `AidexRequest`, `AidexOptions`, `ExecutionContext`,
  `Prompt`, `ProviderResponse`, `Metadata`, plus `AidexConfig`
  (`kernel/configuration/`). All are exported from `@aidex/core` as type-only
  exports; applications implement `Strategy`/`Provider`/`Plugin` themselves.
- **Five-phase lifecycle** (`boot`, `ready`, `beforeExecute`, `afterExecute`,
  `shutdown`) via a private `Lifecycle` class. `boot` fires before any plugin
  is registered and is therefore never observed by any plugin, from any
  source; only `ready` is observable, and only by `config.plugins`-supplied
  plugins. This ordering is recorded in
  [`docs/decisions/ADR-002-lifecycle-order.md`](docs/decisions/ADR-002-lifecycle-order.md).
  `shutdown` is reserved and not yet emitted by any public method.
- **`StrategyNotFoundError`** and **`DuplicateRegistrationError`** — the
  kernel's only two error types, both exported from `@aidex/core`.
- **Private internals** — `StrategyRegistry` and `PluginRegistry`
  (`kernel/registries/`) and `Lifecycle` (`kernel/lifecycle/`) are never
  exported from the package; `Aidex.ts` is their only consumer.
- **Documentation** — nine architecture papers under
  [`docs/architecture/`](docs/architecture/), a forward-looking, non-committal roadmap
  under [`docs/roadmap/`](docs/roadmap/), and two Architecture Decision
  Records under [`docs/decisions/`](docs/decisions/)
  ([`ADR-001`](docs/decisions/ADR-001-kernel-philosophy.md): Aidex is a kernel,
  not a framework or SDK; [`ADR-002`](docs/decisions/ADR-002-lifecycle-order.md):
  lifecycle initialization order). All nine architecture docs and both ADRs were
  audited against the implemented kernel and corrected where they drifted
  (see the `test(kernel)` history for the audit and remediation).
- **Tooling** — TypeScript (strict, ESM, NodeNext), Vitest, ESLint, all wired
  into `npm run typecheck` / `npm test` / `npm run lint` / `npm run build`.
- **Community and governance files** — `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, and a rewritten `README.md`.

### Not included in this release

No AI provider implementation (no Gemini/OpenAI/Claude/Ollama integration).
No concrete strategies. No business logic. No Firebase, no Express, no
Print Platform- or Design Platform-specific code anywhere in `packages/core`. The reserved
folders (`providers/`, `strategies/`, `plugins/`, `builders/`, `validators/`,
`prompts/`, `shared/`, `utils/`) remain empty — see
[`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md) for what's planned, none
of it scheduled.

### Verification

25/25 tests passing. Clean `typecheck`, `lint`, and `build`. Public export
surface independently verified as exactly the 14 names listed above, plus
`Aidex`, `StrategyNotFoundError`, and `DuplicateRegistrationError` — nothing
else reachable from `@aidex/core`.

## [0.0.1] - 2026-07-24

### Added

- Initial repository scaffold: workspace structure, TypeScript configuration, and empty kernel module folders.
