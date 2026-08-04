# 09 — Brand Kit Generator

**Level 4 · Design · Intermediate · ~10 min**

## What problem does this solve?
You have a one-line company description and want a starting-point
brand kit — voice, palette, typography, and a logo concept — instead of
staring at a blank page.

## Why would I use this Aidex feature?
`@aidex/design` bundles four complementary engines behind
`DESIGN_FEATURE_PACKAGE`. Calling `brand`, `palette`, `typography`, and
`logo` from the same brief gives you a coherent starting kit in one
script instead of four disconnected prompts.

## When should I use this in a real project?
Early-stage brand exploration — a first draft to react to and refine
with a real designer, not a replacement for one. **Important:** every
"logo"/"asset" output here is a text description wrapped in a
`data:text/plain,...` URI, not a rendered image — Aidex's provider
abstraction is text-only today, and this example says so rather than
implying otherwise.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider with canned
  brand-kit JSON)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples brand-kit-generator
```

## Expected output
Prompts for a company description, then prints brand guidelines, a
color palette, typography pairings, and a logo text concept.

## Concepts learned
- Composing several engines from one feature package into one output
- `DESIGN_FEATURE_PACKAGE` engine ID naming (`design.brand`, `.palette`, `.typography`, `.logo`)
- Being explicit about a real limitation (text-only "visual" output) instead of hiding it

## Related packages
`@aidex/design`, `@aidex/sdk`

## Next example
[10 — Marketing Campaign](../10-marketing-campaign/README.md) — a
similar multi-engine composition, for `@aidex/marketing`.
