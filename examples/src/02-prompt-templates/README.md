# 02 — Prompt Templates

**Level 1 · Getting Started · Beginner · ~5 min**

## What problem does this solve?
Prompts drift as you tune tone and instructions. Hardcoded prompt
strings scattered through a codebase make "what did the old wording
say" unanswerable once you've overwritten it.

## Why would I use this Aidex feature?
`PromptRegistry` stores every version of a prompt under one `id`,
addressable by exact semver. You can render the latest by default, pin
an older version for a customer stuck on it, or diff versions side by
side — all without string surgery in application code.

## When should I use this in a real project?
Any time a prompt is reused across call sites, or tuned iteratively
based on real output quality — support replies, system instructions,
report templates. Not needed for a genuinely one-off prompt.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples prompt-templates
```

## Expected output
Renders of both prompt versions with variables filled in, the version
list (`1.0.0`, `2.0.0`), then a real (or demo) call using the latest
rendered prompt.

## Concepts learned
- `PromptTemplate` shape: `{id, version, template, variables}`
- `PromptRegistry.render(id, vars, version?)` — defaults to latest
- `PromptRegistry.listVersions(id)` for auditing prompt history

## Related packages
`@aidex/prompts`, `@aidex/sdk`

## Next example
[03 — Interactive Chat](../03-interactive-chat/README.md) — use a
rendered prompt as a system prompt inside a real conversation loop.
