# 12 — Plugin Example

**Level 7 · Plugins · Advanced · ~10 min**

## What problem does this solve?
You have a set of related engines, prompts, and tools that always ship
together — you want to install them as one unit, not wire each up
individually.

## Why would I use this Aidex feature?
`ExtendedPlugin` bundles `registerEngines()`/`registerPrompts()`/
`registerTools()` into one object; `PluginManager.use(plugin)`
registers everything it returns in one call. Note this uses the raw
`Aidex` kernel, not `AIBuilder`/`AI` — that's intentional, not a
limitation to apologize for (see the code comment for the full
architectural reason).

## When should I use this in a real project?
Distributing a reusable bundle of domain-specific engines/prompts/tools
— an internal team library, or a third-party extension to Aidex.

## Requirements
- Node ≥18, pnpm — no API key needed (uses `StubProvider` directly, since
  this example's engine/tool are deterministic and don't call an LLM).

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples plugin-example
```

## Expected output
```
Installing plugin "slug-tools"...
Installed: true

Executing its engine:
  "Ten Tips For Better TypeScript" -> "ten-tips-for-better-typescript"

Rendering its prompt template:
  Write a one-sentence intro for a blog post titled "Ten Tips For Better TypeScript".

Executing its tool:
  word count: 9
```

## Concepts learned
- `ExtendedPlugin`'s three registration hooks and `PluginManager.use()`
- Why `PluginManager` needs a raw `Aidex`, not the SDK façade — two
  deliberate composition tiers, not a gap
- Engines don't have to call an LLM at all (see `text.slugify`)

## Related packages
`@aidex/core`, `@aidex/plugins`, `@aidex/providers`

## Next example
[13 — Tool Registry](../13-tool-registry/README.md) — a closer look at
permission-gated tool execution.
