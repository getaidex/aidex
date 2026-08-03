# @aidex/marketing

## Installation

```sh
pnpm add @aidex/marketing
```

```sh
npm install @aidex/marketing
```

An **Aidex Feature Pack** — campaign planning, SEO, social media, email
marketing, and marketing analytics, built to the reference architecture
`@aidex/document`, `@aidex/content`, `@aidex/design`, and `@aidex/media`
established.

## What this is

A Feature Pack is a domain-specific capability layer built *on* the Aidex
platform, consumed the same way any external developer would consume it —
never granted special access to `packages/core` or any other platform
package. `@aidex/marketing` covers cross-marketing operations: planning
campaigns and calendars; generating SEO keywords, meta tags, and audits;
generating and scheduling social media content; generating email subject
lines, copy, and sequences; and summarizing/analyzing marketing metrics.

## Status

| Phase | What it added | State |
| --- | --- | --- |
| 1 | Engine ids + typed request/response contracts + catalog metadata | Done |
| 2 | Executable engines returning deterministic placeholder results | Done |
| 3 | AI integration — prompt → provider → structured result | Done |
| 4 | Reusable multi-engine workflows | Done |

All 14 engines are AI-backed: each resolves its own registered prompt,
calls `context.provider.generate()`, and parses the response into its
Result type. `MARKETING_ENGINE_METADATA` versions are `1.0.0` across all
14 entries. 5 workflows compose existing engines via `@aidex/workflow`'s
real `Workflow`/`WorkflowStep`/`WorkflowExecutor` contract:
`marketing.workflow.campaign`, `marketing.workflow.social`,
`marketing.workflow.email`, `marketing.workflow.seo`,
`marketing.workflow.analytics`. No new engines, no new prompts, no new
providers, no application-specific logic, no vendor SDKs, no external
APIs.

## Dependencies

`@aidex/catalog` (for the `EngineMetadata` type `MARKETING_ENGINE_METADATA`
is typed against), `@aidex/core` (for `ExecutionContext`/`Provider`/
`Strategy`), `@aidex/engines` (for the `Engine` interface), `@aidex/prompts`
(for `PromptRegistry`), `@aidex/observability` (for the optional
`ObservabilityBus` every Strategy can record events to), and
`@aidex/workflow` (for `Workflow`/`WorkflowStep`/`WorkflowExecutor`, added
this phase). No provider SDK — this package stays provider-agnostic, same
as every other Feature Pack.

## Folder structure

```
src/
  index.ts
  identifiers.ts
  types/
    marketing.types.ts   — MarketingBrief, MarketingChannel (shared base)
    campaign.types.ts    — campaign.plan / campaign.brief / campaign.calendar
    seo.types.ts          — seo.keywords / seo.meta / seo.audit
    social.types.ts       — social.caption / social.hashtags / social.schedule
    email.types.ts        — email.subject / email.copy / email.sequence
    analytics.types.ts    — analytics.summary / analytics.insights
  engines/
    metadata.ts           — MARKETING_ENGINE_METADATA
```

Types are grouped by marketing subdomain (one file per category), matching
`@aidex/media`'s Phase 1 structure — not `@aidex/document`'s/`@aidex/content`'s/
`@aidex/design`'s one-file-per-engine layout.

## Engine identifiers

14 engines across 4 categories, all under the `marketing.*` namespace:

| Category | Engine id |
| --- | --- |
| Campaign | `marketing.campaign.plan`, `marketing.campaign.brief`, `marketing.campaign.calendar` |
| SEO | `marketing.seo.keywords`, `marketing.seo.meta`, `marketing.seo.audit` |
| Social | `marketing.social.caption`, `marketing.social.hashtags`, `marketing.social.schedule` |
| Email | `marketing.email.subject`, `marketing.email.copy`, `marketing.email.sequence` |
| Analytics | `marketing.analytics.summary`, `marketing.analytics.insights` |

## Engine Catalog metadata

`MARKETING_ENGINE_METADATA` registers all 14 engines with `@aidex/catalog`'s
`EngineMetadata` shape — `version: '0.1.0'` (planned, not yet
implemented), one `requestType`/`responseType` pair per engine, and
categories reused entirely from the existing catalog (`generation`,
`transformation`, `analysis`, `planning`, `summarization`, `marketing`) —
zero new categories invented. Live-verified: `EngineCatalog.findByCategory
('marketing')` groups `marketing.social.caption`/`marketing.social.hashtags`
together with `@aidex/design`'s `design.banner`/`design.social-post`, and
`findByCategory('summarization')` groups `marketing.analytics.summary`
with `@aidex/media`'s `media.audio.summarize`.

## Feature Package Manifest

`MARKETING_FEATURE_PACKAGE` (a `FeaturePackage` from `@aidex/sdk`) bundles
every engine, prompt, and catalog-metadata entry this package ships, ready
for `AIBuilder.use(MARKETING_FEATURE_PACKAGE)`:

```ts
import { AIBuilder } from '@aidex/sdk';
import { MARKETING_FEATURE_PACKAGE } from '@aidex/marketing';

const ai = new AIBuilder().provider(myProvider).use(MARKETING_FEATURE_PACKAGE).build();
```

Every engine in this manifest is a **singleton** — constructed once, at
module load, and shared across every `EngineRegistry` that registers it.
Engine implementations must stay stateless: all execution state belongs
on `ExecutionContext`, never on the engine instance itself.

`workflows` (`CampaignWorkflow`, `SocialWorkflow`, `EmailWorkflow`,
`SeoWorkflow`, `AnalyticsWorkflow`) is pass-through only —
`AIBuilder.use()` never registers, adapts, or executes them. Call each
workflow's own `.run(input, provider, options)` directly.

## Design decisions

**`MarketingBrief` stays genuinely minimal — two fields, not more.**
Almost every generative engine in this pack needs a `brief` (the creative
starting point) and benefits from an optional `targetAudience` — unlike
`@aidex/media`'s domain, where a shared "audience" concept doesn't apply
cleanly across image/video/audio operations, marketing is inherently
audience-directed. Fields like `tone`, `channel`, or `budget` stayed out
of the shared base because they're not universal: `seo.audit` has no
audience at all, and `campaign.plan`'s `budget`/`channels` are specific to
one engine, not shared across the pack.

**8 of 14 requests extend `MarketingBrief`; 6 deliberately don't.** The
6 — `campaign.calendar`, `seo.meta`, `seo.audit`, `social.schedule`,
`analytics.summary`, `analytics.insights` — operate on *already-produced*
material (an existing campaign plan, existing page content, an existing
URL, already-written posts, existing metrics data), not a fresh creative
brief. Extending `MarketingBrief` onto them would add a required field
with nothing meaningful to say — the same reasoning `@aidex/media`'s
`image.optimize`/`video.thumbnail`/`audio.transcribe`/`audio.summarize`/
`asset.convert` established for their own domain.

**`MarketingChannel` (marketing.types.ts) vs `SocialPlatform`
(social.types.ts) are deliberately two different types**, not one shared
enum. `MarketingChannel` (`'email' | 'social' | 'seo' | 'paid-ads' |
'content'`) names broad marketing channels a campaign spans; `SocialPlatform`
(`'instagram' | 'twitter' | 'linkedin' | 'facebook' | 'tiktok'`) names
specific social networks a caption/hashtag set/scheduled post targets.
Collapsing them into one union would either pollute campaign-level channel
selection with platform-specific values, or force social engines to
accept irrelevant values like `'paid-ads'`.

**Categories deliberately reuse the existing cross-pack vocabulary, with
zero new categories.** `generation`, `transformation`, `analysis`,
`planning`, and `summarization` are the exact strings `@aidex/document`,
`@aidex/content`, `@aidex/design`, and `@aidex/media` already use.
`marketing` — reused specifically from `design.banner`/`design.social-post`
— is applied to `social.caption`/`social.hashtags` because those two
engines produce the same kind of artifact (a piece of promotional social
content), not because this whole pack is "about marketing" (that would
make the category redundant with `featurePack`, the same reason no other
pack blanket-tags every entry with its own domain name).

**`CampaignCalendarRequest` takes `campaignContext: string`, not a
structured `CampaignPlanResult`.** Phase 1 contracts stay engine-local —
no engine's Request type reaches into another engine's Result type across
files, keeping every contract independently understandable and avoiding a
coupling that would only make sense once real composition (a future
Phase 4 workflow) exists.

**A 3rd validation helper, `assertHasNonEmptyArrayField`, is new to this
pack.** `@aidex/media`'s Phase 2 needed only `assertHasNonEmptyStringField`
and `assertHasValidSource` (a specific object shape). This pack has no
"source" concept, but 3 requests (`social.schedule`'s `posts`,
`analytics.summary`'s/`analytics.insights`' `metrics`) require a
non-empty array — a genuinely recurring shape across 3 engines, unlike
`campaign.calendar`'s one-off required `durationDays` number, which is
validated inline rather than promoted to a 4th shared helper for a single
call site.

**No `assertHasValidSource`-style type-narrowing chain exists here.**
Every validation helper in this pack only narrows `input` to
`Record<string, unknown>`, never to a specific field's type — engines
read fields with a plain cast afterward (`input.brief as string`), the
same pattern `@aidex/media`'s engines use for their own `brief`/`source`
reads once already narrowed. `@aidex/media` needed a more specific
intersected assertion type only for `assertHasValidSource` specifically,
because it was chained *after* a string-field assertion on the same
`input` and needed to preserve access to prior fields through that second
assertion — a scenario this pack's Phase 2 engines don't hit.

**`addDays` (engines/internal/text.ts) makes `campaign.calendar` and
`social.schedule` genuinely deterministic despite producing per-day
dates.** Both derive every date arithmetically from the caller-supplied
`startDate`, never from `Date.now()` — the same "no randomness, no
timestamps" discipline `@aidex/media`'s Phase 2 placeholders established,
extended here to date math instead of asset URLs.

**Every Phase 3 Result shape is genuinely AI-producible text/structured
content — no `@aidex/media`-style "binary asset" workaround was needed
anywhere in this pack.** `@aidex/media`'s Phase 3 had to invent
`mediaAssetFromDescription` (encoding AI text as a `data:text/plain,` URI)
because 9 of its 13 Results represented binary assets a text-only
Provider can't actually render. Every one of this pack's 14 Results —
campaign plans, keyword lists, captions, email copy, metric summaries —
is exactly the kind of structured text a Provider can produce directly, so
every Strategy here parses straight from JSON with no encoding trick.

**Deterministic fields stay deterministic — never re-derived from the
AI — even in the AI-backed Phase 3 versions.** `campaign.plan`'s
`channels`, `campaign.calendar`'s `date`/`channel` per entry,
`email.sequence`'s `sendDayOffset` per step, and `social.schedule`'s
`publishAt` per entry are all computed the same way Phase 2 computed
them — from the request/`addDays`, never asked of the provider. Only the
genuinely creative parts of each Result (objectives, activity text,
subject/body copy, captions) come from the JSON response. This mirrors
`@aidex/media`'s Phase 3 split (`mimeType`/`fileSizeKb` staying
deterministic while `assetUrl` came from AI), applied here to date math
and channel assignment instead.

**`social.schedule` is the one interesting design call in this phase.**
Its Result (`ScheduledPost[]`) already had all its data — `content`,
`platform` from the caller, `publishAt` computable from `startDate` — so a
naive Phase 3 upgrade would have nothing for the provider to do. Instead,
the prompt asks the provider to decide the optimal *publishing order* for
the given posts, returned as a permutation of 0-based indices
(`{"order": [...]}`). `parseSocialScheduleResponse` validates it's a true
permutation (correct length, no duplicates, no out-of-range indices)
before applying it — a genuinely AI-driven decision with deterministic
guardrails, not a rubber-stamp wrapper around already-complete data.

**`buildAudienceNote` is new to this pack** (`strategies/
buildAudienceNote.ts`) — 8 of 14 strategies extend `MarketingBrief` and
can supply an optional `targetAudience`; extracted once rather than
repeated 8 times, in the same spirit as `@aidex/design`'s
`buildGuidanceNote`/`@aidex/media`'s `buildSourceNote` but scoped to the
one field this pack's requests actually share (this pack has no
`style`/`source` concept spanning every request the way those other packs
do).

**`coerce.ts` gained `asRecordArray`/`asNumberArray`, new relative to
`@aidex/media`'s Phase 3.** 4 Result shapes here
(`CampaignPlanResult.objectives`, `SeoKeywordsResult.keywords`,
`SeoAuditResult.findings`, `AnalyticsInsightsResult.insights`) are arrays
of objects, not arrays of strings — `@aidex/media`'s coerce toolkit never
needed an object-array reader because none of its Results had that shape.
`asNumberArray` exists solely for `social.schedule`'s `order` permutation.

**4 of 5 workflows are genuinely data-dependent pipelines — more than
either `@aidex/design`'s or `@aidex/media`'s Phase 4.** `CampaignWorkflow`
chains all 3 steps: `campaign.brief`'s formal document becomes
`campaign.plan`'s own brief text, and `campaign.plan`'s summary/channels
become `campaign.calendar`'s context. `SocialWorkflow` chains all 3:
`social.caption`'s and `social.hashtags`' own outputs are combined into
the single post `social.schedule` schedules. `EmailWorkflow` chains all 3
by folding each step's own output into the next step's brief text as
inspiration/core-message. `SeoWorkflow` chains all 3: `seo.keywords`' top
result becomes `seo.meta`'s `targetKeyword`, and `seo.meta`'s own
title/description are folded into the content `seo.audit` reviews. Only
`AnalyticsWorkflow` has no real dependency between its 2 steps — the same
honest constraint `@aidex/media`'s `AudioProcessingWorkflow` documented:
`analytics.insights`' Phase 1 contract takes structured `MetricPoint[]`,
not free text, so there's no field for `analytics.summary`'s narrative
output to flow into. Reshaping that contract to fit workflow convenience
would violate Phase 4's own "do not duplicate engine logic" constraint
from the other direction. See each workflow's own doc comment for the
specific rationale.

**`social.schedule`'s single-post composition is a deliberate
simplification, not a limitation being hidden.** `SocialWorkflow`
produces exactly one social post (one caption + one hashtag set), so
`social.schedule`'s AI-decided "optimal publishing order" (from Phase 3)
operates on a list of length 1 — a trivial permutation. The workflow
still calls the real engine with its real contract rather than
special-casing around it; a future caller composing multiple
`SocialWorkflow` runs into a shared `posts` array would get genuine
reordering value from the same engine, unchanged.

**Workflow file names also stay unprefixed** (`CampaignWorkflow.ts`, not
`MarketingCampaignWorkflow.ts`), consistent with Phase 1–3's own
unprefixed convention for this pack.

## Why this follows the reference architecture

- **Standalone.** No dependency on any Aidex platform package beyond
  `@aidex/catalog`'s pure metadata type.
- **Consumes, never modifies, the platform.** Nothing in this package
  changes `@aidex/core`, `@aidex/sdk`, `@aidex/providers`, `@aidex/plugins`,
  `@aidex/workflow`, `@aidex/prompts`, `@aidex/tools`, `@aidex/observability`,
  or any other Feature Pack.
- **Strongly typed.** Every one of the 14 engines has its own
  `*Request`/`*Result` pair — no engine is forced into a generic
  `MarketingResult` that would erase real structural differences (a
  keyword list is not a calendar is not an email sequence).
- **Independently publishable.** Standard `package.json`
  `main`/`types`/`exports` shape, `files: ["dist", "README.md"]`, and a
  `dist/` build — the same npm-packaging discipline every other Feature
  Pack in this repo follows (including the repo-wide fix that keeps
  compiled `*.test.ts` files out of every tarball).
