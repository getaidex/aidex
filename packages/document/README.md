# @aidex/document

## Installation

```sh
pnpm add @aidex/document
```

```sh
npm install @aidex/document
```

The first official **Aidex Feature Pack** — and the reference architecture
every future Feature Pack should copy.

## What this is

A Feature Pack is a domain-specific capability layer built *on* the Aidex
platform, consumed the same way any external developer would consume it —
never granted special access to `packages/core` or any other platform
package. `@aidex/document` covers document intelligence: extraction, OCR,
translation, summarization, resume analysis, invoice extraction, and
contract review.

## Status

| Phase | What it added | State |
| --- | --- | --- |
| 1 | Engine ids + typed request/response contracts | Done |
| 2 | `Engine` implementations for all 7 ids — validated input, `NotImplementedError` for the AI call | Done |
| 3 | The first **real**, AI-powered engine: `DocumentSummarizeEngine` | Done — established the reference architecture |
| 4 | Five more real engines, following that exact architecture: `DocumentExtractEngine`, `DocumentTranslateEngine`, `ResumeAnalysisEngine`, `InvoiceExtractionEngine`, `ContractReviewEngine` | Done |
| Expansion Phase 1 | 4 new engine ids + typed request/response contracts: `document.classify`, `document.keywords`, `document.transform`, `document.review` | Done |
| Expansion Phase 2 | `Engine` implementations for all 4 — validated input, deterministic placeholder results, no AI | Done |
| Expansion Phase 3 | AI integration for all 4 — prompt → provider → structured result, following `DocumentSummarizeEngine`'s exact architecture | Done |
| Expansion Phase 4 | 4 reusable multi-engine workflows composing the AI-backed engines above | Done |

**All 11 engines in this package are now AI-backed** except
`document.ocr`. `document.classify`/`document.keywords`/
`document.transform`/`document.review` were upgraded from their own
Phase 2 deterministic placeholders to real `Strategy`-owning engines the
same way the original 6 engines were — `version: '1.0.0'`, own prompt,
own Strategy, text-only for now (see below). They exist to close real
capability gaps identified when scoping document workflows (document
type routing, keyword extraction, generic reformatting, and a
domain-neutral review distinct from `contract.review`). `contract.review`
itself is unchanged — these are new, separate engines, not replacements.
4 workflows now compose these engines via `@aidex/workflow`'s real
`Workflow`/`WorkflowStep`/`WorkflowExecutor` contract:
`document.workflow.document-review`, `document.workflow.document-analysis`,
`document.workflow.document-transformation`,
`document.workflow.document-localization`. No new engines, no new
prompts, no new providers, no engine contract changes.

**`DocumentOcrEngine` is the one *executable* engine deliberately left as
a Phase 2 placeholder** — it validates input and throws `NotImplementedError`. OCR is
Vision AI's job, not Document AI's: it belongs to a future `@aidex/vision`
Feature Pack, or to an OCR-capable Provider, neither of which exists yet.
Every other engine in this package also only handles `text/*` sources for
exactly this reason — see "Design decisions" below.

## Dependencies

`@aidex/core` and `@aidex/engines` (the `Engine`/`ExecutionContext` contracts
this package implements), `@aidex/prompts` (prompt registration/rendering),
`@aidex/observability` (optional cost/token/duration tracking), and
`@aidex/workflow` (for `Workflow`/`WorkflowStep`/`WorkflowExecutor`, added
for Expansion Phase 4). `@aidex/providers` is a **dev**-only dependency,
used solely by tests (`StubProvider`) — never imported by anything this
package ships. No provider SDK is imported anywhere in this package, and
no vendor is hardcoded.

## Engine identifiers

```ts
import { DocumentEngineId } from '@aidex/document';

DocumentEngineId.Extract;       // 'document.extract'
DocumentEngineId.Ocr;           // 'document.ocr'  — still a placeholder
DocumentEngineId.Translate;     // 'document.translate'
DocumentEngineId.Summarize;     // 'document.summarize'
DocumentEngineId.Classify;      // 'document.classify'
DocumentEngineId.Keywords;      // 'document.keywords'
DocumentEngineId.Transform;     // 'document.transform'
DocumentEngineId.Review;        // 'document.review'
DocumentEngineId.ResumeAnalyze; // 'resume.analyze'
DocumentEngineId.InvoiceExtract;// 'invoice.extract'
DocumentEngineId.ContractReview;// 'contract.review'
```

## Types

Every capability has a request and a result type, both built on the shared
`DocumentSource` input:

```ts
interface DocumentSource {
  content: string;   // base64 for binary mime types, plain text for text/plain
  mimeType: string;
  filename?: string;
}
```

| Engine id            | Request                     | Result                     | Strategy                    | Prompt id             |
| --------------------- | ---------------------------- | ---------------------------- | ----------------------------- | ----------------------- |
| `document.extract`    | `DocumentExtractRequest`     | `DocumentExtractResult`      | `DocumentExtractStrategy`     | `document.extract`      |
| `document.ocr`        | `DocumentOcrRequest`         | `DocumentOcrResult`          | *(none — placeholder)*        | *(none)*                |
| `document.translate`  | `DocumentTranslateRequest`   | `DocumentTranslateResult`    | `DocumentTranslateStrategy`   | `document.translate`    |
| `document.summarize`  | `DocumentSummarizeRequest`   | `DocumentSummarizeResult`    | `DocumentSummarizeStrategy`   | `document.summarize`    |
| `document.classify`   | `DocumentClassifyRequest`    | `DocumentClassifyResult`     | `DocumentClassifyStrategy`    | `document.classify`     |
| `document.keywords`   | `DocumentKeywordsRequest`    | `DocumentKeywordsResult`     | `DocumentKeywordsStrategy`    | `document.keywords`     |
| `document.transform`  | `DocumentTransformRequest`   | `DocumentTransformResult`    | `DocumentTransformStrategy`   | `document.transform`    |
| `document.review`     | `DocumentReviewRequest`      | `DocumentReviewResult`       | `DocumentReviewStrategy`      | `document.review`       |
| `resume.analyze`      | `ResumeAnalysisRequest`      | `ResumeAnalysisResult`       | `ResumeAnalysisStrategy`      | `resume.analyze`        |
| `invoice.extract`     | `InvoiceExtractionRequest`   | `InvoiceExtractionResult`    | `InvoiceExtractionStrategy`   | `invoice.extract`       |
| `contract.review`     | `ContractReviewRequest`      | `ContractReviewResult`       | `ContractReviewStrategy`      | `contract.review`       |

## Example usage

`DocumentSummarizeEngine` — result is plain text, no JSON parsing needed:

```ts
import { DocumentSummarizeEngine } from '@aidex/document';
import { GeminiProvider } from '@aidex/providers';
// Any Provider works here — GeminiProvider is just today's example.
// Swapping it for a future OpenAI/Claude provider requires no change
// below: the engine only ever calls context.provider, never a vendor SDK.

const provider = new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
const engine = new DocumentSummarizeEngine();

const result = await engine.execute({
  config: { provider },
  provider,
  request: {
    strategy: 'document.summarize',
    input: {
      source: { content: 'The full text of a long document...', mimeType: 'text/plain' },
      maxLength: 50,
    },
  },
});

console.log(result.summary);
```

`InvoiceExtractionEngine` — result is a structured, strongly-typed object;
the strategy asks the provider for strict JSON and parses it:

```ts
import { InvoiceExtractionEngine } from '@aidex/document';

const engine = new InvoiceExtractionEngine();

const result = await engine.execute({
  config: { provider },
  provider,
  request: {
    strategy: 'invoice.extract',
    input: { source: { content: fullInvoiceText, mimeType: 'text/plain' } },
  },
});

console.log(result.totalAmount, result.currency, result.lineItems);
```

With cost/token tracking (optional, and never tied to a specific vendor's
pricing) — every engine in this package accepts the same config shape:

```ts
import { DocumentSummarizeEngine } from '@aidex/document';
import { ObservabilityBus } from '@aidex/observability';

const observability = new ObservabilityBus();
observability.subscribe((event) => console.log(event.event, event.metadata));

const engine = new DocumentSummarizeEngine({
  observability,
  pricing: { inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 }, // whatever the configured provider actually charges
});
```

Registered in an `EngineRegistry` alongside other engines, dispatched by id
exactly like any other engine in the platform:

```ts
import { EngineRegistry } from '@aidex/engines';
import { DocumentSummarizeEngine, DocumentEngineId } from '@aidex/document';

const registry = new EngineRegistry();
registry.register(new DocumentSummarizeEngine());

const result = await registry.execute(DocumentEngineId.Summarize, {
  config: { provider },
  provider,
  request: { strategy: DocumentEngineId.Summarize, input: { source: { content: '...', mimeType: 'text/plain' } } },
});
```

## Feature Package Manifest

`DOCUMENT_FEATURE_PACKAGE` (a `FeaturePackage` from `@aidex/sdk`) bundles
every engine, prompt, and catalog-metadata entry this package ships, ready
for `AIBuilder.use(DOCUMENT_FEATURE_PACKAGE)`:

```ts
import { AIBuilder } from '@aidex/sdk';
import { DOCUMENT_FEATURE_PACKAGE } from '@aidex/document';

const ai = new AIBuilder().provider(myProvider).use(DOCUMENT_FEATURE_PACKAGE).build();
```

Every engine in this manifest is a **singleton** — constructed once, at
module load, and shared across every `EngineRegistry` that registers it.
Engine implementations must stay stateless: all execution state belongs
on `ExecutionContext`, never on the engine instance itself.

`workflows` (`DocumentReviewWorkflow`, `DocumentAnalysisWorkflow`,
`DocumentTransformationWorkflow`, `DocumentLocalizationWorkflow`) is
pass-through only — `AIBuilder.use()` never registers, adapts, or executes
them. Call each workflow's own `.run(input, provider, options)` directly.

## Design decisions

**Engine + Strategy, not Engine alone.** Every real engine validates input
and delegates to a dedicated `Strategy`, which does the actual work:
renders the prompt, calls the provider, parses the response, and records
observability. This mirrors `@aidex/providers`' own layering (`GeminiProvider`
does the vendor call; a `Strategy` like `TextGenerationStrategy` sits above
it) one level up — the Engine owns *dispatch*, the Strategy owns *AI
execution*. All six real engines in this package follow the identical
split established by `DocumentSummarizeEngine`.

**No nested `Aidex` kernel inside any Engine.** Every `execute()` calls
`this.strategy.execute(request, context)` directly — the exact two-argument
signature `@aidex/core`'s own `Aidex.execute()` uses to dispatch a `Strategy`
internally. Constructing a throwaway `new Aidex({ provider: context.provider
})` just to immediately call the one Strategy an Engine already holds a
reference to would fire boot/ready lifecycle hooks nobody's listening to —
ceremony with no behavior behind it. `context` already carries everything a
kernel would supply here (the configured `Provider`).

**Prompt registered privately, per engine instance.** Each engine owns its
own `PromptRegistry`, created in its constructor and populated with exactly
the one prompt it needs. No shared/global registry, no dependency on
`@aidex/plugins`' `PluginManager` — this package doesn't use plugins at all,
per scope.

**Observability lives in the Strategy, not the Engine — via one shared
helper.** The Strategy is the layer that actually calls
`context.provider.generate()` and receives the raw `ProviderResponse`
(including `metadata.usage`, if the provider supplied it) — the same
reason `GeminiProvider`, not some layer above it, is where `@aidex/providers`
records its own observability. Rather than every Strategy reimplementing
the same timing/try-catch/`track*` block, all six call the shared
`callProviderWithObservability()` (`src/observability/`), established once
`DocumentSummarizeStrategy` proved the pattern and then extracted so five
more strategies could reuse it verbatim instead of re-deriving it. Reading
`metadata.usage` is duck-typed (`unknown`, checked at runtime), not
imported from `@aidex/providers` — this package never depends on a specific
provider's types.

**JSON-backed results share a small parsing toolkit.** `DocumentExtractResult`,
`DocumentTranslateResult`, `ResumeAnalysisResult`, `InvoiceExtractionResult`,
and `ContractReviewResult` are all structured objects, not plain strings —
their strategies prompt for "strict JSON only" and parse the response.
Three small, genuinely-shared pieces back every one of them (`src/parsing/`):
`parseJsonResponse()` (strips a ` ```json ` fence if present, then
`JSON.parse`s, throwing `UnparsableProviderResponseError` on failure) and
`asString`/`asNumber`/`asStringArray`/`asRecord` (defensive readers over
`unknown` — never throw, so each strategy's own parse function decides
which missing/malformed field is fatal vs. just omitted). A parse function
that finds the *required* container shape missing (e.g. no `"fields"` key
at all) throws; one that finds an individual optional field malformed
(e.g. a non-numeric `matchScore`) just omits it — providers occasionally
under-fill optional fields, and that's not the same failure as returning
prose instead of JSON.

**Text-only for now, everywhere.** Every strategy rejects any
`DocumentSource` whose `mimeType` doesn't start with `text/`. Processing a
scanned PDF or image requires OCR first, and `DocumentOcrEngine` is the one
engine in this package intentionally left unimplemented — OCR is Vision AI,
not Document AI, and belongs to a future `@aidex/vision` Feature Pack or an
OCR-capable Provider. Rather than silently mis-processing binary content or
building a partial OCR pipeline out of scope for this pack, every strategy
fails loudly and says why.

**Pricing is caller-supplied, never hardcoded.** `DocumentEnginePricing`
mirrors `@aidex/providers`' `GeminiPricing` shape but names nothing
vendor-specific — whoever configured the `Provider` also knows that
provider's current rates and supplies them.

**Expansion engines (`classify`/`keywords`/`transform`/`review`) all take
a plain `DocumentSource`, never another engine's Result.** This was a
deliberate constraint, not an oversight: `document.extract`'s
`Result{fields: Record<string,string>}` doesn't fit any other engine's
Request, and no new engine here was designed to accept it either — every
engine in this pack stays independently callable with just a source,
matching the convention every existing engine already established. A
document workflow composing several of these will bundle independent
calls on the same source rather than chain one engine's output into
another's input, unless a future phase deliberately designs that
composition.

**`document.review` is a genuinely new, domain-neutral engine — not a
generalized `contract.review`.** Its `DocumentReviewFinding{issue,
severity, recommendation}` mirrors `ContractRisk`'s shape closely
(same three-field structure), but uses domain-neutral naming (`issue`
instead of `clause`) since it reviews any document, not specifically
contracts. `contract.review` itself is untouched — the two are separate,
parallel capabilities, not a refactor.

**`classification` is a genuinely new catalog category — every other new
tag reuses this pack's own existing categories.** `document.keywords` uses
`extraction` (matching `document.extract`/`invoice.extract`);
`document.transform` uses `transformation` (matching `@aidex/design`'s/
`@aidex/media`'s usage); `document.review` uses `analysis` (matching
`contract.review`/`resume.analyze`, both already in this same file). Only
`document.classify` needed a category with no existing analog anywhere in
the catalog.

**Expansion Phase 2 engines followed `DocumentOcrEngine`'s shape (no
Config, no Strategy) only until Phase 3 upgraded them to
`DocumentSummarizeEngine`'s Config/Strategy-owning shape — the same
lifecycle the original 6 engines went through in Phases 2→3/4.** Phase 2
returned deterministic placeholders directly from `execute()`; Phase 3
moved all four to render a prompt, call the Provider, and parse a
structured response, exactly like every other AI-backed engine here.

**`document.transform`'s required `targetFormat` is validated by its
Strategy, not its Engine — the same division of responsibility
`DocumentTranslateEngine`/`DocumentTranslateStrategy` already established
for `targetLanguage`.** `assertHasValidSource` (called at the Engine
layer) only ever proves `source`; every request-specific required field
beyond that is the Strategy's own responsibility to check, a precedent
this package established before this expansion touched it.
`document.transform`'s `mimeType` stays deterministically resolved from
`targetFormat` in the Strategy — never asked of the provider — while
`content` is the one genuinely AI-generated field.

**`document.keywords`' Phase 3 prompt asks the provider for the same
thing its Phase 2 placeholder computed heuristically** — key phrases
from the document's actual content — rather than a different capability;
the placeholder-to-AI upgrade preserves what the engine *means*, not just
its Result shape.

**`metadata.test.ts`'s `PLANNED_IDS` list from Expansion Phase 1 was
retired in Phase 2, once real Engine classes existed for all four** — no
further metadata test changes were needed for Phase 3, since bumping
`metadata.ts`'s versions to `1.0.0` and the real engines' own
`readonly version = '1.0.0'` to match is exactly what the existing
`it.each(REAL_ENGINES)` assertion was already designed to verify.

**3 of 4 Expansion Phase 4 workflows are genuinely data-dependent
pipelines; the 4th is an honestly-documented independent bundle — the
same split `@aidex/marketing`'s Phase 4 established.**
`DocumentReviewWorkflow` adapts `document.extract`'s structured `fields`
into a synthetic `text/plain` `DocumentSource` (via a local
`fieldsToDocumentSource` helper) so `document.review` reviews what was
actually extracted, not the raw original document.
`DocumentTransformationWorkflow` and `DocumentLocalizationWorkflow` both
wrap their first step's genuinely textual output
(`DocumentTransformResult.content`/`DocumentTranslateResult
.translatedText`) into a new `DocumentSource` so `document.summarize`
summarizes the *transformed*/*translated* text, not the original.
`DocumentAnalysisWorkflow`'s two steps (`document.classify`,
`document.keywords`) are **not** chained — `document.classify`'s Result
is a label (`documentType`), not document content, so there's no
meaningful `DocumentSource` to adapt it into. Both steps read the
original `source` directly; the workflow's value is bundling
classification + keywords into one call with shared
lifecycle/cancellation/error handling, not fabricating a dependency the
engines don't support.

**Every cross-step adaptation goes through `DocumentSource` and nothing
else — no engine's Request/Result type was touched.** This was an
explicit constraint for this phase ("adapt it through DocumentSource
inside the workflow only... Do not modify engine contracts"), and every
workflow here honors it: the adaptation logic (`fieldsToDocumentSource`,
wrapping `content`/`translatedText` into `{content, mimeType}`) lives
entirely inside the workflow files, never inside an engine or Strategy.

**`DocumentTransformationWorkflow` inherits `document.summarize`'s
text-only constraint.** Since `document.transform`'s `mimeType` is
resolved from the caller's `targetFormat` and `document.summarize`'s
Strategy only accepts `text/*` sources, this workflow only produces a
meaningful summary for text-format targets (`markdown`, `plain-text`,
`html`) — documented on the workflow itself rather than silently failing
in a confusing place.

**Workflow class names stay `Document`-prefixed** (`DocumentReviewWorkflow`,
not `ReviewWorkflow`), matching this package's own established
engine-naming convention (`DocumentSummarizeEngine`, etc.) — a deliberate
difference from `@aidex/media`'s/`@aidex/marketing`'s unprefixed workflow
names, which themselves matched *those* packages' own unprefixed engine
conventions. Each Feature Pack's workflows follow its own established
prefix, not a single cross-pack rule.

## Why this is the reference architecture

- **Standalone by default, platform-integrated by necessity.** Types and
  ids need nothing; every AI-backed engine needs `@aidex/core`,
  `@aidex/engines`, `@aidex/prompts`, and `@aidex/observability` — and only
  those, added exactly when the capability that needed them was built.
- **Consumes, never modifies, the platform.** Nothing in this package
  changes `@aidex/core`, `@aidex/sdk`, `@aidex/providers`, `@aidex/plugins`,
  `@aidex/workflow`, `@aidex/prompts`, `@aidex/tools`, `@aidex/observability`,
  or `@aidex/evaluation`.
- **Provider-agnostic, proven, not just claimed.** No strategy in this
  package imports a vendor SDK or branches on `context.provider.name` —
  every engine's test suite includes a "provider independence" test that
  runs the same engine against two differently-shaped inline providers and
  asserts both work unchanged.
- **One pattern, proven once, then reused five times.**
  `DocumentSummarizeEngine` established the Engine+Strategy split, the
  direct `strategy.execute(request, context)` call, and the observability
  wrapper. `DocumentExtractEngine`, `DocumentTranslateEngine`,
  `ResumeAnalysisEngine`, `InvoiceExtractionEngine`, and
  `ContractReviewEngine` all reuse the *identical* shared infrastructure
  (`callProviderWithObservability`, `parseJsonResponse`, the `coerce`
  helpers) rather than each re-deriving it — proof the pattern
  generalizes, not just that it worked once.
