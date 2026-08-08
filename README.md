<p align="center">
  <a href="https://getaidex.github.io/">
    <img src="brand/logo-256x256.png" alt="Aidex Logo" width="128" height="128" />
  </a>
</p>

<h1 align="center">Aidex</h1>

<p align="center">
  <strong>A modular, provider-agnostic AI application platform.</strong>
</p>

<p align="center">
  <a href="https://github.com/getaidex/aidex/actions/workflows/ci.yml"><img src="https://github.com/getaidex/aidex/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
</p>

***

**Aidex is a modular, provider-agnostic AI application platform.** A frozen,
minimal kernel at its center, and a set of independent packages around it —
providers, strategies, plugins, engines, prompts, tools, workflow, memory,
and observability — so applications can build AI features once and swap
providers, add capabilities, or reuse pieces across projects without
rewriting the AI stack each time.

## Status

`0.2.1-alpha`, published to npm under the `@aidex` scope. The
kernel (`@aidex/core`) is frozen and stable: public API, lifecycle, and type
contracts are implemented and tested. Every other package listed below is
real, tested, working code — not a roadmap item — but the platform as a
whole is still pre-1.0 and its APIs may change. See
[`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md) for what's next and
[`CHANGELOG.md`](CHANGELOG.md) for what shipped in `0.2.1-alpha`.

## Installation

Install only the packages you need — most applications start with
`@aidex/sdk` plus a provider:

```sh
pnpm add @aidex/sdk @aidex/providers
```

```sh
npm install @aidex/sdk @aidex/providers
```

```sh
yarn add @aidex/sdk @aidex/providers
```

```sh
bun add @aidex/sdk @aidex/providers
```

Every `@aidex/*` package ships ESM and CommonJS builds with matching
TypeScript declarations for both (`moduleResolution: node16`/`nodenext`
included) — see each package's own README for its individual install line
and public API.

Working on Aidex itself, not just consuming it? See
[CONTRIBUTING.md](CONTRIBUTING.md) for cloning the repo and the pnpm-based
dev workflow.

## Quick Start

```ts
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }))
  .build();

const result = await ai.text('Say hello to Aidex in one short sentence.');
console.log(result);
```

Every `@aidex/*` package ships a CommonJS build too — the same example with `require`:

```js
const { AIBuilder } = require('@aidex/sdk');
const { GeminiProvider } = require('@aidex/providers');

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }))
  .build();

ai.text('Say hello to Aidex in one short sentence.').then(console.log);
```

That's the entire public surface most applications ever touch:
`new AIBuilder().provider(p).build()`, then `ai.text()` or `ai.execute()`.
The SDK hides kernel construction, strategy registration, and lifecycle
wiring — see [`packages/sdk`](packages/sdk) for what it does underneath, and
[`packages/core`](packages/core) for the frozen kernel itself if you need to
go lower-level.

## Architecture

```
apps/ (playground)             — reference applications built on the SDK
  └─ packages/sdk               — developer-facing façade (AI, AIBuilder)
       ├─ packages/core         — frozen kernel: dispatch, lifecycle, contracts
       ├─ packages/strategies   — concrete Strategy implementations
       ├─ packages/providers    — concrete Provider implementations (Gemini, ...)
       └─ packages/plugins      — Plugin System (lifecycle hooks + extension registration)
            ├─ packages/engines      — Engine contract + EngineRegistry
            ├─ packages/prompts      — versioned Prompt Registry
            └─ packages/tools        — permission-gated Tool Registry
packages/workflow                — standalone sequential step orchestration
packages/memory                  — standalone generic key/value store
packages/observability            — metrics, cost, timeline, unified event bus
packages/evaluation                — benchmark engines, compare providers
packages/adapters, packages/cli    — Express/Node adapters, command-dispatch CLI class
```

Every arrow points one way — dependents depend on `@aidex/core`'s contracts,
never the reverse, and the kernel itself depends on nothing. See
[`docs/architecture/project-structure.md`](docs/architecture/project-structure.md)
for the full dependency-direction rules and
[`packages/core/README.md`](packages/core/README.md) for the kernel's own
philosophy and public API in detail. Each package listed above has its own
README with the same level of detail.

## Examples

[`examples/`](examples/) is a hands-on course of 15 short, independent,
runnable programs organized into a 9-level learning path — Getting Started,
Providers, Documents, Design, Marketing, Workflow, Plugins, Custom Engines,
and a Capstone that composes everything taught along the way. Every example
runs with zero setup, falling back to a deterministic demo provider when no
`GEMINI_API_KEY` is set. See [`examples/README.md`](examples/README.md).

## Documentation

- [`docs/architecture/`](docs/architecture/) — architecture philosophy, project
  structure, the kernel's public API, request lifecycle, and
  Strategy/Provider/Plugin development guides
- [`docs/guides/`](docs/guides/) — practical guides for integrating a
  provider and adopting Aidex inside an existing application
- [`docs/decisions/`](docs/decisions/) — Architecture Decision Records
- [`docs/vision.md`](docs/vision.md) — product vision and Feature Pack concepts
- [`docs/roadmap/`](docs/roadmap/) — forward-looking, non-committal roadmap
- [`docs/FAQ.md`](docs/FAQ.md) — frequently asked questions
- Each package's own `README.md` — architecture, public API, and dependency
  direction for that specific package

Start with [`docs/architecture/kernel-philosophy.md`](docs/architecture/kernel-philosophy.md)
for why Aidex exists, or the Quick Start above for how to use it.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Questions, ideas, and feature
requests, as well as bugs, are all welcome in
[Issues](https://github.com/getaidex/aidex/issues).

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## License

MIT — see [LICENSE](LICENSE).
