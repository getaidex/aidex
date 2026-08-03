# Aidex

[![CI](https://github.com/getaidex/aidex/actions/workflows/ci.yml/badge.svg)](https://github.com/getaidex/aidex/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Aidex is a modular, provider-agnostic AI application platform.** A frozen,
minimal kernel at its center, and a set of independent packages around it —
providers, strategies, plugins, engines, prompts, tools, workflow, memory,
and observability — so applications can build AI features once and swap
providers, add capabilities, or reuse pieces across projects without
rewriting the AI stack each time.

## Status

`v0.1.0-alpha`. The kernel (`@aidex/core`) is frozen and stable: public API,
lifecycle, and type contracts are implemented and tested. Every other
package listed below is real, tested, working code — not a roadmap item —
but the platform as a whole is still pre-1.0 and its APIs may change. See
[`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md) for what's next.

## Installation

Not yet published to npm (see [FAQ](docs/FAQ.md)). To use it today, clone
the repository and reference a package locally:

```sh
git clone https://github.com/getaidex/aidex.git
cd aidex
npm install
npm run build
```

Then, from another project on the same machine, depend on a package via a
local `file:` reference (the same approach this repo's own
[`examples/`](examples/) and any application integrating Aidex would use pre-1.0):

```json
{
  "dependencies": {
    "@aidex/sdk": "file:../aidex/packages/sdk",
    "@aidex/providers": "file:../aidex/packages/providers"
  }
}
```

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
packages/adapters, packages/cli    — Express/Node adapters, executable CLI
```

Every arrow points one way — dependents depend on `@aidex/core`'s contracts,
never the reverse, and the kernel itself depends on nothing. See
[`docs/architecture/project-structure.md`](docs/architecture/project-structure.md)
for the full dependency-direction rules and
[`packages/core/README.md`](packages/core/README.md) for the kernel's own
philosophy and public API in detail. Each package listed above has its own
README with the same level of detail.

## Examples

[`examples/`](examples/) has eight short, independent, runnable programs —
Hello World, a custom Provider, a custom Engine, a Plugin registering an
Engine/Prompt/Tool together, a multi-step Workflow with cancellation, the
Prompt Registry, the Tool Registry, and Observability. See
[`examples/README.md`](examples/README.md).

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
