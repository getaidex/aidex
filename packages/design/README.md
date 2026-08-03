# @aidex/design

## Installation

```sh
pnpm add @aidex/design
```

```sh
npm install @aidex/design
```

An **Aidex Feature Pack** — creative design generation, built to the
reference architecture `@aidex/document` and `@aidex/content` established.

## What this is

A Feature Pack is a domain-specific capability layer built *on* the Aidex
platform, consumed the same way any external developer would consume it —
never granted special access to `packages/core` or any other platform
package. `@aidex/design` covers creative design generation: layouts, brand
identity, color palettes, typography, posters, flyers, business cards,
banners, logos, social media graphics, presentations, mockups, and
reusable templates.

This is the first Feature Pack where reusability across a broad developer
audience — not any single application — was the explicit design goal:
generic creative workflows any marketing team, agency, ecommerce brand,
startup, social media manager, print company, or enterprise design system
would recognize, not fields modeled after one specific product.

## Status

| Phase | What it added | State |
| --- | --- | --- |
| 1 | Engine ids + typed request/response contracts + catalog metadata | Done |
| 2 | 7 `Engine` implementations, validated input, deterministic placeholder results | Done |
| 3 | AI integration for those same 7 engines — prompts, Strategies, provider execution | Done |
| 4 | Reusable multi-engine workflows composing existing engines | Done |
| Expansion Phase 1 | Confirmed the remaining 7 ids' request/result contracts + `DESIGN_ENGINE_METADATA` entries (already in place since Phase 1) | Done |
| Expansion Phase 2 | 7 more `Engine` implementations for the remaining ids — validated input, deterministic placeholder results, no AI | Done |
| Expansion Phase 3 | AI integration for those same 7 engines — prompts, Strategies, provider execution, following Phase 3's exact pattern | Done |

**All 14 of 14 ids are now real, AI-backed engines**: the original 7
(`design.brand`, `design.logo`, `design.palette`, `design.typography`,
`design.business-card`, `design.mockup`, `design.presentation`) from
Phase 3, and the remaining 7 (`design.generate`, `design.layout`,
`design.poster`, `design.flyer`, `design.banner`, `design.social-post`,
`design.template`) upgraded from Expansion Phase 2's deterministic
placeholders in Expansion Phase 3 — same `Engine → PromptRegistry →
Strategy → Provider → structured Result` pipeline, same shared
infrastructure (`callProviderWithObservability`, `parseJsonResponse`,
`coerce.ts`, `assetFromDescription`), no new mechanism invented.
`DESIGN_ENGINE_METADATA` is `version: '1.0.0'` across all 14 entries.
**2 workflows** compose engines: `design.workflow.brand-kit`
(`design.brand` → `design.logo` → `design.palette` → `design.typography`)
and `design.workflow.presentation` (`design.presentation`). A third,
`design.workflow.marketing-assets`, remains **not** built — its 3 engines
(`design.poster`, `design.banner`, `design.social-post`) are now AI-backed
too, but no phase has proposed that composition yet; nothing about
Expansion Phase 3 required or ruled it out.

## Dependencies

`@aidex/core` and `@aidex/engines` (the `Engine`/`ExecutionContext`
contracts), `@aidex/prompts` (prompt registration/rendering),
`@aidex/observability` (optional cost/token/duration tracking),
`@aidex/catalog` (the `EngineMetadata` type), and `@aidex/workflow`
(`Workflow`/`WorkflowStep`/`WorkflowExecutor`, consumed exactly as shipped
— nothing in this package modifies it). `@aidex/providers` is a
**dev**-only dependency, used solely by tests — never imported by
anything this package ships. No provider SDK is imported anywhere in this
package, and no vendor is hardcoded.

## Engine identifiers

```ts
import { DesignEngineId } from '@aidex/design';

DesignEngineId.Generate;     // 'design.generate'       — metadata only
DesignEngineId.Layout;       // 'design.layout'          — metadata only
DesignEngineId.Brand;        // 'design.brand'           — AI-backed
DesignEngineId.Palette;      // 'design.palette'         — AI-backed
DesignEngineId.Typography;   // 'design.typography'      — AI-backed
DesignEngineId.Poster;       // 'design.poster'          — metadata only
DesignEngineId.Flyer;        // 'design.flyer'           — metadata only
DesignEngineId.BusinessCard; // 'design.business-card'   — AI-backed
DesignEngineId.Banner;       // 'design.banner'          — metadata only
DesignEngineId.Logo;         // 'design.logo'            — AI-backed
DesignEngineId.SocialPost;   // 'design.social-post'     — metadata only
DesignEngineId.Presentation; // 'design.presentation'    — AI-backed
DesignEngineId.Mockup;       // 'design.mockup'          — AI-backed
DesignEngineId.Template;     // 'design.template'        — metadata only
```

## Types

### The shared base — only what's genuinely universal

```ts
interface DesignBrief {
  brief: string;               // required — a description of what to create
  targetAudience?: string;
  style?: string;
  outputFormat?: 'png' | 'jpg' | 'svg' | 'pdf';
}
```

Every one of the 14 requests extends `DesignBrief`. `dimensions`,
`platform`, `branding`, and `assets` are each their own standalone type,
and every request opts into only the ones that genuinely apply to it (see
`docs`/Phase 1 design decisions below).

### Per-engine contracts

| Engine id | Request | Result |
| --- | --- | --- |
| `design.brand` | `DesignBrandRequest` | `DesignBrandResult` |
| `design.logo` | `DesignLogoRequest` | `DesignLogoResult` |
| `design.palette` | `DesignPaletteRequest` | `DesignPaletteResult` |
| `design.typography` | `DesignTypographyRequest` | `DesignTypographyResult` |
| `design.business-card` | `DesignBusinessCardRequest` | `DesignBusinessCardResult` |
| `design.mockup` | `DesignMockupRequest` | `DesignMockupResult` |
| `design.presentation` | `DesignPresentationRequest` | `DesignPresentationResult` |

(The other 7 ids' types exist too — see `src/types/` — but have no Engine yet.)

## Example usage

Structured, non-visual result (color palette) — a genuinely complete,
honest AI integration with no caveats:

```ts
import { DesignPaletteEngine } from '@aidex/design';
import { GeminiProvider } from '@aidex/providers';
// Any Provider works here — GeminiProvider is just today's example.

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
const engine = new DesignPaletteEngine();

const result = await engine.execute({
  config: { provider },
  provider,
  request: {
    strategy: 'design.palette',
    input: { brief: 'A warm, inviting coffee shop brand', colorCount: 4 },
  },
});

console.log(result.colors); // [{ name, hex, role }, ...]
```

Visual-asset result (logo) — see "A known limitation, not hidden" below
for what `assetUrl` actually contains:

```ts
import { DesignLogoEngine } from '@aidex/design';

const engine = new DesignLogoEngine();
const result = await engine.execute({
  config: { provider },
  provider,
  request: { strategy: 'design.logo', input: { brief: 'Minimalist coffee shop logo', variantsCount: 2 } },
});

console.log(result.primary.assetUrl); // "data:text/plain,<url-encoded AI-generated description>"
```

With cost/token tracking (optional):

```ts
import { DesignBrandEngine } from '@aidex/design';
import { ObservabilityBus } from '@aidex/observability';

const observability = new ObservabilityBus();
const engine = new DesignBrandEngine({
  observability,
  pricing: { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
});
```

## Workflows

Built on `@aidex/workflow`'s real `Workflow`/`WorkflowStep`/
`WorkflowExecutor` contract — a `WorkflowStep.execute(context)` mutates a
shared, plain `WorkflowContext<TState>` object in place, and
`WorkflowExecutor` runs steps sequentially, stopping immediately if one
throws. Neither workflow below reinvents that; each just composes existing
`@aidex/design` engines as steps.

```ts
import { BrandKitWorkflow } from '@aidex/design';

const workflow = new BrandKitWorkflow();
const kit = await workflow.run(
  { brandName: 'Cedar & Bean', industry: 'hospitality', targetAudience: 'coffee drinkers', style: 'warm, minimalist' },
  provider
);

kit.brand;      // DesignBrandResult      — the initial creative direction
kit.logo;       // DesignLogoResult       — refined, using brand's palette/typography as context
kit.palette;    // DesignPaletteResult    — refined, complementing brand's starter colors
kit.typography; // DesignTypographyResult — refined, complementing brand's starter fonts
```

`design.brand` runs first and establishes an initial direction (a logo
concept, a starter palette, starter typography, guidelines); the three
steps after it each refine one specific piece, informed by that direction
via `branding` — the kit converges on one coherent identity instead of
four unrelated calls. Lifecycle events (`workflow-started`, `step-started`,
`step-completed`, `step-failed`, `workflow-completed`) and `AbortSignal`
cancellation are both supported, exactly as `@aidex/workflow` provides them:

```ts
await workflow.run(input, provider, {
  onEvent: (event) => console.log(event.type, event.stepName),
  signal: controller.signal,
});
```

```ts
import { PresentationWorkflow } from '@aidex/design';

const workflow = new PresentationWorkflow();
const result = await workflow.run({ topic: 'Series A pitch', audience: 'investors', style: 'confident' }, provider);
result.slides; // DesignAssetResult[]
```

## Engine Catalog metadata

```ts
import { EngineCatalog } from '@aidex/catalog';
import { DESIGN_ENGINE_METADATA } from '@aidex/design';

const catalog = new EngineCatalog();
for (const metadata of DESIGN_ENGINE_METADATA) catalog.register(metadata);
```

`version` is `'1.0.0'` across all 14 entries — matching
`@aidex/document`'s/`@aidex/content`'s exact convention for a fully
implemented pack. The last 7 to reach `'1.0.0'` were the Expansion Phase 2
placeholders, upgraded to AI-backed in Expansion Phase 3.
`metadata.test.ts` asserts every entry's `name`/`description`/`version`
against its real engine class.

## Feature Package Manifest

`DESIGN_FEATURE_PACKAGE` (a `FeaturePackage` from `@aidex/sdk`) bundles
every engine, prompt, and catalog-metadata entry this package ships, ready
for `AIBuilder.use(DESIGN_FEATURE_PACKAGE)`:

```ts
import { AIBuilder } from '@aidex/sdk';
import { DESIGN_FEATURE_PACKAGE } from '@aidex/design';

const ai = new AIBuilder().provider(myProvider).use(DESIGN_FEATURE_PACKAGE).build();
```

Every engine in this manifest is a **singleton** — constructed once, at
module load, and shared across every `EngineRegistry` that registers it.
Engine implementations must stay stateless: all execution state belongs
on `ExecutionContext`, never on the engine instance itself.

`workflows` (`BrandKitWorkflow`, `PresentationWorkflow`) is pass-through
only — `AIBuilder.use()` never registers, adapts, or executes them. Call
each workflow's own `.run(input, provider, options)` directly.

## A known limitation, not hidden

`Provider.generate()` in this platform is **text-only**
(`{ content: string }`) — there is no image-rendering capability anywhere
in Aidex, and this phase explicitly could not add one (no external APIs).
So for the 12 of 14 engines whose `Result` includes a `DesignAssetResult`
(`design.brand`, `design.logo`, `design.business-card`, `design.mockup`,
`design.presentation`, and — since Expansion Phase 3 — `design.generate`,
`design.layout`, `design.poster`, `design.flyer`, `design.banner`,
`design.social-post`, `design.template`), "AI-backed" cannot mean "the AI
returns real pixels." It means: the AI generates a genuine creative
*specification* (composition, color, typography, imagery direction) via
the same text Provider every other engine in this platform uses, and that
specification becomes `assetUrl`, encoded as a `data:text/plain,` URI
(RFC 2397) — a real, valid, dereferenceable URL carrying the AI's actual
output, not a placeholder string that resolves to nothing. `design.palette`
and `design.typography` have no such gap — their results are pure
structured data (colors, font names), which a text Provider produces
completely and honestly. A future Vision/Media Feature Pack or a Provider
capable of real image generation would replace `assetFromDescription()`'s
implementation with an actually-rendered file; no `Result` type needs to
change when that happens.

## Design decisions

**`assetFromDescription()` is the one new shared piece Phase 3 added.**
Every visual-asset engine's Strategy calls it once per generated asset —
`design.logo` calls it up to `1 + variantsCount` times,
`design.presentation` once per slide. It is the direct, honest answer to
the text-only-Provider-vs-visual-Result tension above, not a workaround
buried in one engine.

**`buildGuidanceNote` reused from `@aidex/content`'s pattern, not its
code.** Every one of the 7 AI-backed requests shares `targetAudience`/
`style` (from `DesignBrief`); `design.brand`'s `industry` is folded into
the same helper as a third optional field rather than justifying a
separate one.

**`callProviderWithObservability` built on the mature shape from the
start.** All 7 strategies needed it simultaneously (Phase 2 already built
all 7 placeholder engines together, unlike `@aidex/document`'s/
`@aidex/content`'s one-engine-first phase 3), so there was never a "first
draft, inline" stage to begin from.

**Required container vs. optional field, applied consistently.** Every
parser distinguishes "the field that's the entire point of the call is
missing" (throws `UnparsableProviderResponseError`: `logoDescription`,
`primaryDescription`, the whole `colors`/`pairings` array,
`frontDescription`, `description`, the whole `slides` array) from "an
optional embellishment is missing" (silently omitted: `guidelines`,
`variantDescriptions`, `backDescription` when not double-sided) — the same
distinction `@aidex/document`'s and `@aidex/content`'s multi-field engines
draw.

**Metadata versions were split 7/7 for a while, not uniformly `0.1.0`.**
Phase 1 left every entry at `'0.1.0'`, explicitly noting a future phase
should update them once real engines existed. Phase 2 (placeholder
engines) deliberately did *not* bump them, matching
`@aidex/document`'s/`@aidex/content`'s own "placeholder = `0.1.0`, AI-backed
= `1.0.0`" convention. Phase 3 was that convention's own first trigger —
the original 7 AI-backed entries moved to `'1.0.0'` — and Expansion Phase
3 closed the gap: all 14 are `'1.0.0'` now.

**No application logic, no Design Platform/Print Platform references, anywhere.**
Confirmed by grep, not just by omission — see the Phase 3 and Phase 4
delivery reports for this exact verification.

**Workflow steps communicate by mutating shared state, not by chaining
return values.** That's `@aidex/workflow`'s actual contract
(`WorkflowStep.execute(context): Promise<void>`, not
`Promise<NextStepInput>`) — `BrandKitWorkflow`'s 4 steps each read/write a
private `BrandKitWorkflowState` object built specifically for this
workflow, not a generic pipeline abstraction invented on top of
`@aidex/workflow`.

**`design.workflow.marketing-assets` was not built, not stubbed.** Its 3
required engines (`design.poster`, `design.banner`, `design.social-post`)
have no `Engine` class — only metadata. Phase 4 explicitly forbade faking
an engine implementation to unblock it, so there is nothing in
`src/workflows/` for it at all, not even a contract-only placeholder —
building scaffolding for a workflow that cannot execute would be
speculative in the same way this package has avoided building
speculative shared helpers in every earlier phase.

**Building `BrandKitWorkflow` surfaced a real Phase 3 gap, fixed here.**
`DesignPaletteRequest`/`DesignTypographyRequest`/`DesignLogoRequest`/
`DesignBusinessCardRequest` have all declared an optional `branding`
field since Phase 1 — Phase 1's own doc comment for `DesignPaletteRequest`
says "lets the palette complement an existing brand color" — but Phase 3's
strategies never actually read it. A `BrandKitWorkflow` test asserting
that `design.palette`'s rendered prompt mentioned `design.brand`'s output
colors failed, for the honest reason: it never could have. Fixed by
adding `readBranding()` (mirroring the existing `readDimensions()`
pattern) and folding it into `DesignPaletteStrategy`'s,
`DesignTypographyStrategy`'s, `DesignLogoStrategy`'s, and
`DesignBusinessCardStrategy`'s guidance notes — the same fix, in all 4
places it was missing, not just the one this workflow happened to
exercise. `DesignMockupRequest` and `DesignBrandRequest` were correctly
unaffected: neither declares a `branding` field.

## Why this follows the reference architecture

- **Consumes, never modifies, the platform.** Nothing in this package
  changes `@aidex/core`, `@aidex/sdk`, `@aidex/providers`, `@aidex/plugins`,
  `@aidex/workflow`, `@aidex/prompts`, `@aidex/tools`, `@aidex/observability`,
  `@aidex/evaluation`, `@aidex/catalog`, `@aidex/document`, or `@aidex/content`.
- **Provider-agnostic, proven, not just claimed.** No strategy in this
  package imports a vendor SDK or branches on `context.provider.name`.
- **Every engine and strategy is independently tested**, including
  invalid-input handling and provider-response-parsing failures, using
  mock/stub providers only — no real AI API calls in any test.
- **Contracts and discoverability before implementation, implementation
  before the next phase.** Phase 1 fixed the shape and made it
  discoverable; Phase 2 proved every engine could validate against it;
  Phase 3 proves the shape survives a real AI call, end to end.
