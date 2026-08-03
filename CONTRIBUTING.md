# Contributing to Aidex

Thanks for your interest in Aidex. This document covers how the repository is
organized, how to get set up, and the conventions this project actually
enforces — not aspirational ones.

## Before you start

Aidex is a kernel, not an application. Read
[`docs/architecture/kernel-philosophy.md`](docs/architecture/kernel-philosophy.md)
first — specifically the Golden Rule:

> *"If a feature is required by only one application, it does not belong inside
> Aidex."*

Every change to `packages/core` is measured against that rule. If you're
building something Print Platform-specific, Design Platform-specific, or specific to any single
consumer, it belongs in that application, not in this kernel. If you're unsure
whether a change belongs here, open an issue or a draft PR and ask before
writing code.

## Setup

```bash
npm install
npm run typecheck   # tsc -b --noEmit
npm run lint         # eslint packages/*/src apps/*/src examples/src
npm test              # vitest run
npm run build        # tsc -b
```

All four must pass before a PR is reviewed. Node `>=18` is required (see
`engines` in the root `package.json`).

## Project structure

This is an npm-workspaces monorepo. `packages/core` is the frozen kernel;
everything else composes it:

| Package | What it is |
| --- | --- |
| `packages/core` | The kernel. Frozen — see "Before you start" above. |
| `packages/providers` | Concrete `Provider` implementations (Gemini, Stub). |
| `packages/strategies` | Concrete `Strategy` implementations. |
| `packages/plugins` | Concrete `Plugin`s + the Plugin System (`PluginManager`). |
| `packages/engines` | `Engine` contract + `EngineRegistry`. |
| `packages/prompts` | `PromptRegistry`. |
| `packages/tools` | `ToolRegistry`. |
| `packages/workflow` | Standalone sequential step orchestration. |
| `packages/memory` | Standalone generic key/value store. |
| `packages/observability` | Metrics, cost, timeline, unified event bus. |
| `packages/evaluation` | Benchmarking / provider comparison. |
| `packages/sdk` | The primary developer-facing façade (`AI`, `AIBuilder`). |
| `packages/adapters`, `packages/cli` | Framework adapters and the CLI. |
| `apps/playground` | A minimal reference application. |
| `examples/` | Short, independent, runnable usage examples. |

Each package has its own `README.md` covering its architecture, public API,
and dependency direction — read that first before changing a package you're
unfamiliar with. Within `packages/core/src/` specifically, read
[`docs/architecture/project-structure.md`](docs/architecture/project-structure.md):
`kernel/registries/` and `kernel/lifecycle/` are private, nothing outside
`kernel/Aidex.ts` should import them, and `types/` holds the public contracts
every other package implements against.

**Where does new code go?** A new way to talk to an AI backend is a
`Provider` (in `packages/providers`, or your own package implementing the
same interface). A new AI task is a `Strategy`. A cross-cutting concern is a
`Plugin`. None of these — ever — go inside `packages/core`.

## Making a change

1. **Read the relevant architecture doc first.** If your change affects the
   public API, the lifecycle, or any exported contract, the corresponding doc
   under `docs/architecture/` describes the current, intended behavior. Changes
   that contradict an architecture doc without updating it are treated as bugs in
   the PR, not in the doc.
2. **Follow TDD.** Write the test first, confirm it fails for the right
   reason, then implement. This repo's existing test suite (`packages/core/src/**/*.test.ts`)
   is the reference for style — real behavioral assertions, not smoke tests.
3. **Keep the public API frozen.** `Aidex` has exactly four public members:
   `constructor(config)`, `use(plugin)`, `registerStrategy(strategy)`,
   `execute(request)`. A PR that adds a fifth public method, or exports
   `StrategyRegistry`/`PluginRegistry`/`Lifecycle` from `packages/core/src/index.ts`,
   needs an ADR (see below) before it can be merged, not just a review approval.
4. **No application-specific code in `packages/core`.** No Firebase, no
   Print Platform/Design Platform-specific fields, no hardcoded provider (Gemini, OpenAI, etc.)
   logic inside the kernel itself. If a contract you're adding mentions a
   specific application or vendor by name, it belongs outside `packages/core`.
5. **Architecture Decision Records.** A change to the frozen public API, the
   lifecycle ordering, or another already-recorded architectural decision
   requires a new ADR under `docs/decisions/`, numbered sequentially
   (`ADR-003-...`, etc.), following the format in
   [`docs/decisions/ADR-001-kernel-philosophy.md`](docs/decisions/ADR-001-kernel-philosophy.md).
   Implementation refinements (bug fixes, internal restructuring that doesn't
   change observable behavior, test improvements) don't need one.

## Commit and PR conventions

- Commit messages: short, imperative, prefixed by type where it helps
  (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) — see `git log` for the
  existing style.
- Keep PRs scoped to one concern. A PR that mixes a kernel behavior change
  with a documentation fix is harder to review and harder to revert.
- If your PR touches an architecture doc, verify the doc still matches the
  code exactly, with no drift in either direction.

## Reporting bugs and requesting features

Open an [issue](https://github.com/getaidex/aidex/issues) using the bug
report or feature request template. For open-ended questions or ideas that
aren't yet a concrete bug/feature, use
[Discussions](https://github.com/getaidex/aidex/discussions) instead.
For anything security-related, see [SECURITY.md](SECURITY.md) instead of a
public issue.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). Participation
in this repository means agreeing to abide by it.
