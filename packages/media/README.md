# @aidex/media

## Installation

```sh
pnpm add @aidex/media
```

```sh
npm install @aidex/media
```

An **Aidex Feature Pack** — image, video, and audio generation, editing,
and transcription, built to the reference architecture `@aidex/document`,
`@aidex/content`, and `@aidex/design` established.

## What this is

A Feature Pack is a domain-specific capability layer built *on* the Aidex
platform, consumed the same way any external developer would consume it —
never granted special access to `packages/core` or any other platform
package. `@aidex/media` covers cross-media operations: generating,
editing, and producing variants of images; generating, editing,
storyboarding, and thumbnailing video; generating, transcribing, and
summarizing audio; and converting/transforming any media asset generally.

## Status

| Phase | What it added | State |
| --- | --- | --- |
| 1 | Engine ids + typed request/response contracts + catalog metadata | Done |
| 2 | Executable engines returning deterministic placeholder results | Done |
| 3 | AI integration — prompt → provider → structured result | Done |
| 4 | Reusable multi-engine workflows | Done |

All 13 engines are AI-backed: each resolves its own registered prompt,
calls `context.provider.generate()`, and parses the response into its
Result type. `MEDIA_ENGINE_METADATA` versions are `1.0.0` across all 13
entries. 3 workflows compose existing engines via `@aidex/workflow`'s real
`Workflow`/`WorkflowStep`/`WorkflowExecutor` contract:
`media.workflow.image-enhancement`, `media.workflow.video-preparation`,
`media.workflow.audio-processing`. No new engines, no new prompts, no new
providers, no application-specific logic, no vendor SDKs, no external
APIs.

## Dependencies

`@aidex/catalog` (for the `EngineMetadata` type `MEDIA_ENGINE_METADATA` is
typed against), `@aidex/core` (for `ExecutionContext`/`Provider`/`Strategy`),
`@aidex/engines` (for the `Engine` interface), `@aidex/prompts` (for
`PromptRegistry`), `@aidex/observability` (for the optional
`ObservabilityBus` every Strategy can record events to), and `@aidex/workflow`
(for `Workflow`/`WorkflowStep`/`WorkflowExecutor`, added this phase). No
provider SDK — this package stays provider-agnostic, same as every other
Feature Pack.

## Folder structure

```
packages/media/
  src/
    index.ts
    identifiers.ts          MediaEngineId
    types/
      media.types.ts        MediaBrief, MediaSource, MediaAssetResult, Asset*
      image.types.ts        Image* request/result types
      video.types.ts        Video* request/result types
      audio.types.ts        Audio* request/result types
    engines/
      metadata.ts           MEDIA_ENGINE_METADATA (+ its test)
```

Types are grouped by media kind here, not one file per engine the way
`@aidex/document`/`@aidex/content`/`@aidex/design` do — a deliberate,
explicitly-requested structure for this pack, since several engines
within the same kind (e.g. all 4 image operations) genuinely share value
types (`ImageOutputFormat`, `MediaSource`) more than they'd gain from
being split across separate files.

## Engine identifiers

```ts
import { MediaEngineId } from '@aidex/media';

MediaEngineId.ImageGenerate;    // 'media.image.generate'
MediaEngineId.ImageEdit;        // 'media.image.edit'
MediaEngineId.ImageVariant;     // 'media.image.variant'
MediaEngineId.ImageOptimize;    // 'media.image.optimize'
MediaEngineId.VideoGenerate;    // 'media.video.generate'
MediaEngineId.VideoEdit;        // 'media.video.edit'
MediaEngineId.VideoStoryboard;  // 'media.video.storyboard'
MediaEngineId.VideoThumbnail;   // 'media.video.thumbnail'
MediaEngineId.AudioGenerate;    // 'media.audio.generate'
MediaEngineId.AudioTranscribe;  // 'media.audio.transcribe'
MediaEngineId.AudioSummarize;   // 'media.audio.summarize'
MediaEngineId.AssetConvert;     // 'media.asset.convert'
MediaEngineId.AssetTransform;   // 'media.asset.transform'
```

## Types

### The shared base — deliberately one field

```ts
interface MediaBrief {
  brief: string; // required — a description of intent
}
```

Unlike `@aidex/design`'s `DesignBrief` (used by all 14 requests),
`MediaBrief` is extended by only **8 of the 13** requests here. The other
5 — `image.optimize`, `video.thumbnail`, `audio.transcribe`,
`audio.summarize`, `asset.convert` — are purely technical, parameter-driven
operations (a target format, a timestamp, a language hint) fully
described by their own explicit fields. Forcing a "creative brief" onto
"convert this file to mp4" would be artificial, the same reasoning
`@aidex/content` used to justify *not* giving `content.rewrite` and
`content.generate` a shared base at all.

```ts
interface MediaSource { url: string; mimeType: string; }
interface MediaAssetResult { assetUrl: string; mimeType: string; }
```

### Per-engine contracts

| Engine id | Request | Result | Extends `MediaBrief`? |
| --- | --- | --- | --- |
| `media.image.generate` | `ImageGenerateRequest` | `ImageGenerateResult` | ✅ |
| `media.image.edit` | `ImageEditRequest` | `ImageEditResult` | ✅ |
| `media.image.variant` | `ImageVariantRequest` | `ImageVariantResult` | ✅ |
| `media.image.optimize` | `ImageOptimizeRequest` | `ImageOptimizeResult` | — |
| `media.video.generate` | `VideoGenerateRequest` | `VideoGenerateResult` | ✅ |
| `media.video.edit` | `VideoEditRequest` | `VideoEditResult` | ✅ |
| `media.video.storyboard` | `VideoStoryboardRequest` | `VideoStoryboardResult` | ✅ |
| `media.video.thumbnail` | `VideoThumbnailRequest` | `VideoThumbnailResult` | — |
| `media.audio.generate` | `AudioGenerateRequest` | `AudioGenerateResult` | ✅ |
| `media.audio.transcribe` | `AudioTranscribeRequest` | `AudioTranscribeResult` | — |
| `media.audio.summarize` | `AudioSummarizeRequest` | `AudioSummarizeResult` | — |
| `media.asset.convert` | `AssetConvertRequest` | `AssetConvertResult` | — |
| `media.asset.transform` | `AssetTransformRequest` | `AssetTransformResult` | ✅ |

Most results are `MediaAssetResult` (one output file). Three aren't,
because they genuinely aren't "one file":

```ts
ImageVariantResult      // { variants: MediaAssetResult[] }
VideoStoryboardResult   // { scenes: StoryboardScene[] }
AudioTranscribeResult   // { text: string, detectedLanguage? }
AudioSummarizeResult    // { summary: string }
```

```ts
import type { ImageEditRequest, ImageEditResult } from '@aidex/media';

const request: ImageEditRequest = {
  brief: 'Remove the background and replace it with a soft gradient',
  source: { url: 'https://example.com/photo.png', mimeType: 'image/png' },
  outputFormat: 'png',
};

// Once a future phase implements the engine:
// const result: ImageEditResult = await engine.execute({ input: request, ... });
```

## Engine Catalog metadata

```ts
import { EngineCatalog } from '@aidex/catalog';
import { MEDIA_ENGINE_METADATA } from '@aidex/media';

const catalog = new EngineCatalog();
for (const metadata of MEDIA_ENGINE_METADATA) catalog.register(metadata);

catalog.findByCategory('summarization');
// document.summarize, content.summarize, media.audio.summarize —
// cross-pack discovery, not just same-pack bookkeeping

catalog.findByCategory('generation');
// content.generate, content.blog, ..., design.generate,
// media.image.generate, media.video.generate, media.audio.generate
```

Every entry's `version` is `'0.1.0'` — honestly reflecting that no
`Engine` class exists yet, matching `@aidex/design`'s own Phase 1
convention exactly (not `@aidex/document`'s/`@aidex/content`'s, whose
metadata was written *after* their engines were real). `metadata.test.ts`
checks structural correctness instead of a drift guard, since there's no
real engine to drift from yet.

## Feature Package Manifest

`MEDIA_FEATURE_PACKAGE` (a `FeaturePackage` from `@aidex/sdk`) bundles
every engine, prompt, and catalog-metadata entry this package ships, ready
for `AIBuilder.use(MEDIA_FEATURE_PACKAGE)`:

```ts
import { AIBuilder } from '@aidex/sdk';
import { MEDIA_FEATURE_PACKAGE } from '@aidex/media';

const ai = new AIBuilder().provider(myProvider).use(MEDIA_FEATURE_PACKAGE).build();
```

Every engine in this manifest is a **singleton** — constructed once, at
module load, and shared across every `EngineRegistry` that registers it.
Engine implementations must stay stateless: all execution state belongs
on `ExecutionContext`, never on the engine instance itself.

`workflows` (`ImageEnhancementWorkflow`, `VideoPreparationWorkflow`,
`AudioProcessingWorkflow`) is pass-through only — `AIBuilder.use()` never
registers, adapts, or executes them. Call each workflow's own
`.run(input, provider, options)` directly.

## Design decisions

**`MediaBrief` stays genuinely minimal — one field, not four.**
`@aidex/design`'s `DesignBrief` also carries `targetAudience`/`style`/
`outputFormat` because *every* one of its 14 requests is an inherently
style-driven creative artifact. Media isn't uniformly that: `audio
.transcribe` has no meaningful "style," and `outputFormat` varies too
much by kind (`png` vs `mp4` vs `mp3`) to live in one generic base
without losing type safety. Each kind's own `*OutputFormat` union
(`ImageOutputFormat`, `VideoOutputFormat`, `AudioOutputFormat`) is more
honest than a shared `string`.

**8 of 13 requests extend `MediaBrief`; 5 deliberately don't.** The 5 —
`image.optimize`, `video.thumbnail`, `audio.transcribe`,
`audio.summarize`, `asset.convert` — are fully specified by explicit
parameters (a source, a target format, a timestamp, a language, a max
length). Extending `MediaBrief` onto them would add a required field with
nothing meaningful to say.

**`audio.summarize` mirrors `document.summarize`/`content.summarize`
field-for-field** (`source`, `maxLength?`) rather than inventing a new
convention for an identical idea — the same reasoning
`@aidex/content`'s `ContentSummarizeRequest`/`ContentTranslateRequest`
already established for reusing `@aidex/document`'s shape when the same
concept genuinely recurs.

**Types grouped by media kind, not one file per engine.** This is the one
explicit structural deviation from `@aidex/document`'s/`@aidex/content`'s/
`@aidex/design`'s file layout, requested for this pack specifically — see
"Folder structure" above.

**Categories deliberately reuse the existing cross-pack vocabulary.**
`generation`, `transformation`, and `summarization` aren't new categories
invented for this pack — they're the exact strings `@aidex/document`,
`@aidex/content`, and `@aidex/design` already use, verified live (see
"Verification" in the delivery report) to prove `findByCategory()`
actually groups across all four packs, not just within `@aidex/media`.

**`assertHasValidSource` narrows `input` to `Record<string, unknown> &
{ source: MediaSource }`, not just `{ source: MediaSource }`.** Several
engines (e.g. `image.edit`, `asset.transform`) call
`assertHasNonEmptyStringField` (narrowing to `Record<string, unknown>`)
*then* `assertHasValidSource` on the same `input`. If the second
assertion's type didn't preserve the `Record<string, unknown>`
intersection, the earlier narrowing would be lost and subsequent field
reads (`input.brief`) would stop type-checking. The convention this pack
follows throughout: always call `assertHasNonEmptyStringField` (when
needed) *before* `assertHasValidSource`, never after.

**`readEnum<T extends string>` is new to this pack.** Image, video, and
audio each have their own closed `outputFormat` union; a single generic
reader parameterized by the valid set replaced three near-identical
hand-written readers.

**`mediaAssetFromDescription` — the same known limitation @aidex/design's
`assetFromDescription` documents, ported for media.** `Provider.generate()`
is text-only across this entire platform; there is no image/video/audio
rendering capability, and Phase 3 explicitly forbids adding one (no
external APIs, no vendor SDKs). For every engine whose Result is a
`MediaAssetResult` (9 of 13: everything that generates, edits, extracts,
converts, or transforms a binary asset), "AI-backed" means the provider
produces a genuine structured specification — composition, edit
instructions, scene direction — encoded as a `data:text/plain,` URI
(RFC 2397), not real bytes and not a `placeholder://` string that resolves
to nothing. `mimeType` stays deterministically computed (never
AI-invented) — only `assetUrl` carries the provider's actual output.

**`audio.transcribe`/`audio.summarize` have their own, distinct known
limitation, documented separately.** These aren't binary-asset engines —
they analyze an *existing* asset the provider was never given the bytes
of, only a `source.url`/`mimeType`. Since there's no external ASR API to
call (forbidden anyway), their prompts ask explicitly for a
clearly-labeled, best-effort placeholder rather than letting the provider
imply it "listened" to audio it never received. See
`audioTranscribePrompt.ts`/`audioSummarizePrompt.ts` for the full
rationale — a different justification from `mediaAssetFromDescription`'s,
so documented separately rather than folded into the same note.

**`video.storyboard` needs neither trick.** Its Result (`scenes: readonly
StoryboardScene[]`) is genuinely textual content the provider can
authentically produce — no binary asset, no inaccessible source to
pretend to analyze — so it parses straight from JSON like any other
Feature Pack's plain-text Strategy.

**Strategy/prompt file names stay unprefixed** (`ImageGenerateStrategy.ts`,
not `MediaImageGenerateStrategy.ts`), matching Phase 1/2's own unprefixed
engine naming — a deliberate, consistent deviation from
`@aidex/design`'s `Design`-prefixed convention, since this pack's Phase 1
folder structure (types grouped by media kind) was already established as
its own convention rather than the document/content/design norm.

**`buildSourceNote` is new to this pack** (`strategies/buildSourceNote.ts`)
— 9 of 13 strategies take a `source` and need to mention it in their
prompt; extracted once rather than repeated 9 times, in the same spirit as
`@aidex/design`'s `buildGuidanceNote` but scoped to the one field media's
requests actually share structurally (media has no single shared
`targetAudience`/`style` concept the way `DesignBrief` does).

**Only 2 of 3 workflows are genuinely data-dependent pipelines, and that's
an honest reflection of the underlying engines' contracts, not a
shortcut.** `media.workflow.image-enhancement`'s `VariantStep` calls
`media.image.variant` with the *optimized* asset's `assetUrl`/`mimeType`
as its `source` — real composition, mirroring `@aidex/design`'s
`BrandKitWorkflow` flowing `design.brand`'s output into its later steps.
`media.workflow.video-preparation` and `media.workflow.audio-processing`
compose two engines that both read from the shared workflow input
independently, because their underlying engines' Phase 1 contracts don't
support piping one's output into the other (`video.thumbnail` extracts
from a video `source`, unrelated to `video.storyboard`'s planning text;
`audio.summarize` takes a `source`, not free text, so a transcript can't
flow in). Reshaping those contracts to fit a workflow's convenience would
violate Phase 4's own "do not duplicate engine logic inside workflows"
constraint from the other direction — it still means composing exactly
what `@aidex/media` already ships, not fabricating a dependency the engines
don't support. Both workflows still deliver real value: one call, shared
lifecycle events, cancellation, and error propagation instead of two
unrelated ones. See each workflow's own doc comment for the specific
rationale.

**Workflow file names also stay unprefixed** (`ImageEnhancementWorkflow.ts`,
not `MediaImageEnhancementWorkflow.ts`), consistent with Phase 1–3's own
unprefixed convention for this pack.

## Why this follows the reference architecture

- **Standalone.** No dependency on any Aidex platform package beyond
  `@aidex/catalog`'s pure metadata type.
- **Consumes, never modifies, the platform.** Nothing in this package
  changes `@aidex/core`, `@aidex/sdk`, `@aidex/providers`, `@aidex/plugins`,
  `@aidex/workflow`, `@aidex/prompts`, `@aidex/tools`, `@aidex/observability`,
  `@aidex/evaluation`, `@aidex/catalog`, `@aidex/document`, `@aidex/content`,
  or `@aidex/design`.
- **Contracts and discoverability before implementation.** Ids, types,
  and catalog metadata are defined and stable before a single line of AI
  logic exists — the same discipline every prior Feature Pack followed
  from its own Phase 1.
