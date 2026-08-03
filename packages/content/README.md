# @aidex/content

An **Aidex Feature Pack** — content generation and editing, built to the
reference architecture `@aidex/document` established.

## What this is

A Feature Pack is a domain-specific capability layer built *on* the Aidex
platform, consumed the same way any external developer would consume it —
never granted special access to `packages/core` or any other platform
package. `@aidex/content` covers content generation and editing: generation,
rewriting, expansion, shortening, translation, summarization, tone
adjustment, SEO optimization, blog posts, email, social posts, product
descriptions, headlines, and taglines.

## Status

| Phase | What it added | State |
| --- | --- | --- |
| 1 | Engine ids + typed request/response contracts | Done |
| 2 | `Engine` implementations for all 14 ids — validated input, `NotImplementedError` for the AI call | Done |
| 3 | The first **real**, AI-powered engine: `ContentRewriteEngine` | Done |
| 4 | The remaining 13 engines, made real on the same pattern | Done |
| 5 | 6 reusable multi-engine workflows composing the 14 AI-backed engines above | Done |

**All 14 engines are real** — every one validates its input, renders a
registered prompt, calls the configured `Provider`, parses the response
into its typed `Result`, and records observability. There is no
placeholder engine left in this package (unlike `@aidex/document`, where
`DocumentOcrEngine` stays a deliberate, permanent placeholder pending OCR).
6 workflows now compose these engines via `@aidex/workflow`'s real
`Workflow`/`WorkflowStep`/`WorkflowExecutor` contract — the maximum
meaningful set the current 14-engine inventory supports, covering every
engine at least once: `content.workflow.blog`, `content.workflow.social`,
`content.workflow.email`, `content.workflow.repurpose`,
`content.workflow.article`, `content.workflow.product-launch`. No new
engines, no new prompts, no new providers, no engine contract changes.

## Dependencies

`@aidex/core` and `@aidex/engines` (the `Engine`/`ExecutionContext`
contracts every engine implements), `@aidex/prompts` (prompt registration/
rendering), `@aidex/observability` (optional cost/token/duration
tracking), and `@aidex/workflow` (for `Workflow`/`WorkflowStep`/
`WorkflowExecutor`, added for Phase 5). `@aidex/providers` is a **dev**-only
dependency, used solely by tests (`StubProvider`) — never imported by
anything this package ships. No provider SDK is imported anywhere in this
package, and no vendor is hardcoded.

## Engine identifiers

```ts
import { ContentEngineId } from '@aidex/content';

ContentEngineId.Generate;           // 'content.generate'
ContentEngineId.Rewrite;            // 'content.rewrite'
ContentEngineId.Expand;             // 'content.expand'
ContentEngineId.Shorten;            // 'content.shorten'
ContentEngineId.Translate;          // 'content.translate'
ContentEngineId.Summarize;          // 'content.summarize'
ContentEngineId.Tone;               // 'content.tone'
ContentEngineId.Seo;                // 'content.seo'
ContentEngineId.Blog;               // 'content.blog'
ContentEngineId.Email;              // 'content.email'
ContentEngineId.Social;             // 'content.social'
ContentEngineId.ProductDescription; // 'content.product-description'
ContentEngineId.Headline;           // 'content.headline'
ContentEngineId.Tagline;            // 'content.tagline'
```

Ids are namespaced `<domain>.<action>`, matching the id shape
`@aidex/engines`' `EngineRegistry` expects.

## Types

Every capability has its own request and result type. Unlike
`@aidex/document` (where every request shares one `DocumentSource` input),
this pack's capabilities split into two honest shapes rather than forcing
a single artificial one: **generation** requests start from a topic/brief
(no existing content yet), and **transformation** requests start from
existing `content` text to be changed.

| Engine id | Request | Result | Required field(s) | Result shape |
| --- | --- | --- | --- | --- |
| `content.generate` | `ContentGenerateRequest` | `ContentGenerateResult` | `topic` | single string |
| `content.rewrite` | `ContentRewriteRequest` | `ContentRewriteResult` | `content` | single string |
| `content.expand` | `ContentExpandRequest` | `ContentExpandResult` | `content` | single string |
| `content.shorten` | `ContentShortenRequest` | `ContentShortenResult` | `content` | single string |
| `content.translate` | `ContentTranslateRequest` | `ContentTranslateResult` | `content`, `targetLanguage` | JSON |
| `content.summarize` | `ContentSummarizeRequest` | `ContentSummarizeResult` | `content` | single string |
| `content.tone` | `ContentToneRequest` | `ContentToneResult` | `content`, `tone` | single string |
| `content.seo` | `ContentSeoRequest` | `ContentSeoResult` | `content` | JSON |
| `content.blog` | `ContentBlogRequest` | `ContentBlogResult` | `topic` | JSON |
| `content.email` | `ContentEmailRequest` | `ContentEmailResult` | `purpose` | JSON |
| `content.social` | `ContentSocialRequest` | `ContentSocialResult` | `topic` | JSON |
| `content.product-description` | `ContentProductDescriptionRequest` | `ContentProductDescriptionResult` | `productName` | single string |
| `content.headline` | `ContentHeadlineRequest` | `ContentHeadlineResult` | `topic` | JSON array |
| `content.tagline` | `ContentTaglineRequest` | `ContentTaglineResult` | `brandName` | JSON array |

## Example usage

Single-string-result engine — no JSON parsing needed:

```ts
import { ContentRewriteEngine } from '@aidex/content';
import { GeminiProvider } from '@aidex/providers';
// Any Provider works here — GeminiProvider is just today's example.
// Swapping it for a future OpenAI/Claude provider requires no change
// below: every engine only ever calls context.provider, never a vendor SDK.

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
const engine = new ContentRewriteEngine();

const result = await engine.execute({
  config: { provider },
  provider,
  request: {
    strategy: 'content.rewrite',
    input: { content: 'Our product is really good and you should buy it.', instructions: 'make it more persuasive' },
  },
});

console.log(result.rewrittenContent);
```

Structured-result engine — the provider is asked for strict JSON, then parsed:

```ts
import { ContentBlogEngine } from '@aidex/content';

const engine = new ContentBlogEngine();

const result = await engine.execute({
  config: { provider },
  provider,
  request: {
    strategy: 'content.blog',
    input: { topic: 'Why TypeScript monorepos scale better than polyrepos', tone: 'informative' },
  },
});

console.log(result.title, result.content);
```

With cost/token tracking (optional, and never tied to a specific vendor's
pricing) — every engine in this package accepts the same config shape:

```ts
import { ContentRewriteEngine } from '@aidex/content';
import { ObservabilityBus } from '@aidex/observability';

const observability = new ObservabilityBus();
observability.subscribe((event) => console.log(event.event, event.metadata));

const engine = new ContentRewriteEngine({
  observability,
  pricing: { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 }, // whatever the configured provider actually charges
});
```

Validation errors are the same shape across all 14:

```ts
import { ContentBlogEngine, InvalidContentEngineInputError } from '@aidex/content';

const engine = new ContentBlogEngine();

await engine.execute({
  config: { provider },
  provider,
  request: { strategy: 'content.blog', input: {} }, // missing "topic"
});
// throws InvalidContentEngineInputError: Invalid input for "content.blog": "topic" must be a non-empty string
```

## Feature Package Manifest

`CONTENT_FEATURE_PACKAGE` (a `FeaturePackage` from `@aidex/sdk`) bundles
every engine, prompt, and catalog-metadata entry this package ships, ready
for `AIBuilder.use(CONTENT_FEATURE_PACKAGE)`:

```ts
import { AIBuilder } from '@aidex/sdk';
import { CONTENT_FEATURE_PACKAGE } from '@aidex/content';

const ai = new AIBuilder().provider(myProvider).use(CONTENT_FEATURE_PACKAGE).build();
```

Every engine in this manifest is a **singleton** — constructed once, at
module load, and shared across every `EngineRegistry` that registers it.
Engine implementations must stay stateless: all execution state belongs
on `ExecutionContext`, never on the engine instance itself.

`workflows` (`ContentBlogWorkflow`, `ContentSocialWorkflow`,
`ContentEmailWorkflow`, `ContentRepurposeWorkflow`, `ContentArticleWorkflow`,
`ContentProductLaunchWorkflow`) is pass-through only — `AIBuilder.use()`
never registers, adapts, or executes them. Call each workflow's own
`.run(input, provider, options)` directly.

## Design decisions

**No forced shared base type.** `@aidex/document`'s `DocumentSource` works
because every single request genuinely starts from the same thing — an
uploaded file. Content requests don't: `content.generate` starts from a
`topic`, `content.rewrite` starts from existing `content`, `content.email`
starts from a `purpose`. Each request type models what that engine
actually needs.

**One shared validator, parameterized by field name.**
`assertHasNonEmptyStringField(origin, input, fieldName)` takes the field
name as a parameter since this pack's 14 requests don't share one
(`content`/`topic`/`purpose`/`productName`/`brandName`), unlike
`@aidex/document`'s `assertHasValidSource` which can hardcode `source`.
Every engine calls it once for its primary required field;
`ContentTranslateEngine`/`ContentToneEngine` call it a second time for
their one extra required field.

**`origin`, not `engineId`.** `InvalidContentEngineInputError` names its
field `origin` because it genuinely holds either an engine id (from an
Engine's own check, via `this.id`) or a Strategy name (from a Strategy
validating independently, via `this.name`) — every one of the 14
strategies calls the shared validator with its own `this.name`, so this
isn't hypothetical. `@aidex/document`'s equivalent error was originally
called `engineId` and its own audit found that name misleading once
Strategies started validating independently; naming it accurately from
Phase 2 here meant no later rename was needed.

**`callProviderWithObservability` started from the mature shape.**
`@aidex/document`'s version began inline inside one strategy and was only
extracted once five more needed the identical block. This package's
version is a direct port of that *already-extracted* helper, built before
a second strategy existed — because "make it the reference implementation
for every remaining engine" made the reuse a known fact, not a hypothesis.
All 14 strategies call it.

**JSON-parsing toolkit ported once seven engines actually needed it.**
`ContentTranslateEngine`, `ContentSeoEngine`, `ContentBlogEngine`,
`ContentEmailEngine`, `ContentSocialEngine`, `ContentHeadlineEngine`, and
`ContentTaglineEngine` all have multi-field or array results — plain
`response.content.trim()` can't produce those. `parseJsonResponse` (strips
a ` ```json ` fence, then parses, throwing `UnparsableProviderResponseError`
on failure) and `asString`/`asNumber`/`asStringArray`/`asRecord` are a
direct port of `@aidex/document`'s identically-shaped toolkit — built here
only once a real consumer needed it (`ContentTranslateEngine`, the first
of the seven), not speculatively during Phase 3 when only
`ContentRewriteEngine`'s single-string result existed.

**Two more small helpers extracted mid-implementation, not planned upfront.**
`buildGuidanceNote({ keywords, tone, length })` — used by
`ContentGenerateStrategy` and `ContentBlogStrategy`, which happen to offer
the exact same three optional guidance fields. `parseRequiredStringArrayField`
— used by `ContentHeadlineStrategy` and `ContentTaglineStrategy`, both of
which have a Result that's *only* a required array of strings, so a
missing/non-array field is a genuine parse failure (that's the whole point
of the call), while individual non-string entries are filtered rather than
failing the whole response. Both were written the second engine actually
needed the identical logic, not the first — consistent with not
speculatively building `@aidex/document`'s style of helper on Phase 3's
`ContentRewriteEngine`, which had no use for either.

**Required container vs. optional field, applied consistently.** Every
structured parser distinguishes "the field that's the entire point of the
call is missing" (throws `UnparsableProviderResponseError`: `translatedContent`,
`optimizedContent`, `title`+`content`, `subject`+`body`, `content` for
social, the whole `headlines`/`taglines` array) from "an optional
embellishment is missing" (silently omitted: `detectedSourceLanguage`,
`suggestedKeywords`, `metaDescription`, `hashtags`) — the same distinction
`@aidex/document`'s multi-field engines draw.

**Engine still just calls `strategy.execute(request, context)` directly.**
No nested `Aidex` kernel anywhere in this package — `context` already
carries the configured `Provider`, and every Engine already holds a direct
reference to its one `Strategy`.

**`NotImplementedError` was removed, not left unused.** It existed only to
signal "valid input, no AI call wired yet" during Phase 2/3. Once all 14
engines became real, nothing threw it anymore — rather than ship a dead
class in the public API, it and its test were deleted the moment the last
engine that could have used it went real.

**Internal helpers stay unexported.** `assertHasNonEmptyStringField`,
`buildGuidanceNote`, `callProviderWithObservability`/
`CallProviderWithObservabilityParams`, and the whole `src/parsing/`
toolkit are not part of this package's public API. `@aidex/document`'s own
audit flagged exporting equivalent internal plumbing with no consumer ever
calling it directly — applied here from the start.

**Phase 5's 6 workflows were designed only after inspecting the real
engine inventory — the task's own explicit instruction.** All 14 engines
turned out fully AI-backed (unlike `@aidex/document`'s inventory at the
time its own Phase 4 was scoped, which had 4 missing capabilities), so
every proposed workflow could be built from real engines with zero gaps
to report.

**5 of 6 workflows are fully or mostly chained; all 6 use at least one
genuine data dependency.** `ContentArticleWorkflow`
(generate→rewrite→expand) and `ContentSocialWorkflow`
(social→tone→shorten) chain every step. `ContentEmailWorkflow`
(email→tone→translate) chains on the body specifically — `content.tone`/
`content.translate` each take one `content` string, not a
`{subject, body}` pair, so `email.subject` is deliberately left
untouched by the pipeline, a documented scope choice. `ContentBlogWorkflow`
chains `content.blog`→`content.seo` but keeps `content.headline`
independent (it takes a `topic`, not existing content — there's nothing
of `content.blog`'s output to adapt it from).
`ContentRepurposeWorkflow`/`ContentProductLaunchWorkflow` both use a
"fan-out from one shared upstream result" shape: `content.summarize`'s/
`content.product-description`'s own output feeds two downstream steps
each, not chaining those two downstream steps to each other. No workflow
here needed `@aidex/document`'s `AnalyticsWorkflow`-style fully-independent
bundle — content's engines all take plain strings, so adapting one
step's textual output into the next step's input field never required
a wrapper type the way `@aidex/document`'s `DocumentSource`/`@aidex/media`'s
synthetic sources did.

**No adaptation layer was needed, unlike `@aidex/document`'s
`fieldsToDocumentSource`.** Every content engine's Request/Result already
speaks in plain `content`/`topic`/`purpose` strings — chaining
`stepA.result.someField` into `stepB`'s `content`/`topic`/`purpose` input
is a direct assignment, no wrapper object required. This is a genuine
difference in this pack's own domain shape, not a shortcut: `@aidex/document`
needed `DocumentSource{content, mimeType}` because every engine there
represents one file-like document; `@aidex/content`'s engines never did.

**Workflow class names stay `Content`-prefixed** (`ContentBlogWorkflow`,
not `BlogWorkflow`), matching this package's own established
engine-naming convention (`ContentBlogEngine`, etc.) — the same
per-pack-prefix-convention rule `@aidex/document`'s own Phase 4 README
note established: each Feature Pack's workflows follow its own engine
prefix, not one cross-pack rule.

## Why this follows the reference architecture

- **Standalone by default, platform-integrated by necessity.** Types and
  ids need nothing; every engine needs `@aidex/core`, `@aidex/engines`,
  `@aidex/prompts`, and `@aidex/observability` — and only those.
- **Consumes, never modifies, the platform.** Nothing in this package
  changes `@aidex/core`, `@aidex/sdk`, `@aidex/providers`, `@aidex/plugins`,
  `@aidex/workflow`, `@aidex/prompts`, `@aidex/tools`, `@aidex/observability`,
  `@aidex/evaluation`, or `@aidex/document`.
- **Provider-agnostic, proven, not just claimed.** No strategy in this
  package imports a vendor SDK or branches on `context.provider.name` —
  every engine's test suite includes a "provider independence" test that
  runs the same engine against two differently-shaped inline providers and
  asserts both work unchanged.
- **Every engine is independently tested.** All 14 engines and all 14
  strategies have their own test file.
- **One pattern, proven once, then reused thirteen times.**
  `ContentRewriteEngine` established the Engine+Strategy split, the direct
  `strategy.execute(request, context)` call, and the observability
  wrapper. Every other engine reuses the *identical* shared infrastructure
  rather than each re-deriving it.
