# @aidex/catalog

## Installation

```sh
pnpm add @aidex/catalog
```

```sh
npm install @aidex/catalog
```

A discoverable, queryable registry of **Engine metadata** — for every
Feature Pack installed in an Aidex application, not any one specific pack.

## What this is

Every Aidex Feature Pack (`@aidex/document`, `@aidex/content`, and whatever
comes next) ships a set of `Engine` implementations. Nothing in the
platform previously answered "what engines exist across everything I've
installed, and what do they do?" without importing every Feature Pack and
inspecting its classes by hand. `@aidex/catalog` is that answer: a plain,
queryable registry of *descriptions* of engines — never the engines
themselves.

## What this is not

- **Not a Provider.** No AI calls, no vendor SDK, nothing network-facing.
- **Not an execution path.** `EngineCatalog` never calls `.execute()` on
  anything — for that, use `@aidex/engines`' `EngineRegistry`, which holds
  real `Engine` instances and dispatches to them. This package holds
  *descriptions*, not instances.
- **Not a Feature Pack itself.** It doesn't know `@aidex/document` or
  `@aidex/content` exist — it depends on neither. Feature Packs depend on
  *it* (for the `EngineMetadata` type), never the other way around.
- **Not a singleton.** `new EngineCatalog()` — every instance is
  independent, the same discipline every registry in this platform
  follows (`StrategyRegistry`, `PluginRegistry`, `EngineRegistry`,
  `PromptRegistry`, `ToolRegistry`, `@aidex/sdk`'s `AIBuilder`).

## The metadata model

```ts
interface EngineMetadata {
  id: string;             // matches the real Engine's .id, e.g. 'document.summarize'
  name: string;            // matches the real Engine's .name
  featurePack: string;     // e.g. '@aidex/document'
  version: string;         // matches the real Engine's .version
  description: string;     // matches the real Engine's .description
  requestType: string;     // the request type's *name*, e.g. 'DocumentSummarizeRequest'
  responseType: string;    // the result type's *name*, e.g. 'DocumentSummarizeResult'
  tags: readonly string[]; // e.g. ['document', 'summarization', 'ai']
  category: string;        // e.g. 'summarization' — open, not a closed enum
  requiredCapabilities?: readonly ProviderCapability[]; // mirrors @aidex/engines' Engine.requiredCapabilities, reuses @aidex/providers' capability model
}
```

`requestType`/`responseType` are strings, not the actual TypeScript types.
Types are erased at runtime — a metadata registry can only ever carry
their *names*. `category` and `tags` are open `string`/`string[]`, not a
closed union: a future Feature Pack (`@aidex/design`, `@aidex/code`, ...)
must be able to introduce new categories and tags without this package
changing.

**This isn't automatically derived from the real Engine classes.** There's
no reflection, no decorators, no build step that reads `DocumentSummarizeEngine`
and generates its metadata — each Feature Pack hand-writes its own
`EngineMetadata` array, and it's that pack's responsibility to keep it in
sync with its actual `Engine.id`/`.name`/`.description`/`.version` values.
`@aidex/document`'s and `@aidex/content`'s own `metadata.test.ts` files
assert every entry's `id`/`name`/`version` against the real engine's own
fields for exactly this reason — catching drift is a test's job here, not
a runtime guarantee this package can make on its own.

## Registration mechanism

Feature Packs export a plain array; nothing in this package or in the
Feature Pack registers anything automatically. An application decides
which Feature Packs it has and registers each one's entries itself:

```ts
import { EngineCatalog } from '@aidex/catalog';
import { DOCUMENT_ENGINE_METADATA } from '@aidex/document';
import { CONTENT_ENGINE_METADATA } from '@aidex/content';

const catalog = new EngineCatalog();

for (const metadata of [...DOCUMENT_ENGINE_METADATA, ...CONTENT_ENGINE_METADATA]) {
  catalog.register(metadata);
}
```

Registering the same `id` twice throws `@aidex/core`'s
`DuplicateRegistrationError` — the same fail-loud convention every other
registry in this platform uses.

## Public API

```ts
class EngineCatalog {
  register(metadata: EngineMetadata): void;
  has(id: string): boolean;
  list(): EngineMetadata[];
  find(id: string): EngineMetadata | undefined;
  findByFeaturePack(featurePack: string): EngineMetadata[];
  findByTag(tag: string): EngineMetadata[];
  findByCategory(category: string): EngineMetadata[];
}
```

```ts
catalog.list();
// every registered engine across every installed Feature Pack

catalog.find('content.rewrite');
// the one entry, or undefined

catalog.findByFeaturePack('@aidex/document');
// every engine @aidex/document ships

catalog.findByTag('ai');
// every AI-backed engine across every installed pack

catalog.findByCategory('translation');
// document.translate AND content.translate — cross-pack discovery
// is the whole point of a shared category vocabulary
```

```ts
interface EngineLookup<TEngine = unknown> {
  get(id: string): TEngine | undefined;
}

interface ResolvedCatalogEngine<TEngine = unknown> {
  metadata: EngineMetadata;
  engine: TEngine;
}

function resolveCatalogEngine<TEngine = unknown>(
  catalog: EngineCatalog,
  registry: EngineLookup<TEngine>,
  id: string
): ResolvedCatalogEngine<TEngine> | undefined;
```

## Combining Catalog with a Registry (and the SDK)

`EngineCatalog` never executes anything — for that, an application also
builds an `@aidex/engines` `EngineRegistry` (or, at the SDK layer, an
`@aidex/sdk` `AIBuilder`) holding the real, executable `Engine` instances.
`resolveCatalogEngine()` pairs the two, read-only:

```ts
import { EngineCatalog, resolveCatalogEngine } from '@aidex/catalog';
import { EngineRegistry } from '@aidex/engines';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import { DOCUMENT_ENGINE_METADATA, DocumentExtractEngine } from '@aidex/document';

const catalog = new EngineCatalog();
for (const metadata of DOCUMENT_ENGINE_METADATA) {
  catalog.register(metadata);
}

const documentExtractEngine = new DocumentExtractEngine();
const registry = new EngineRegistry();
registry.register(documentExtractEngine);

const resolved = resolveCatalogEngine(catalog, registry, 'document.extract');
if (resolved) {
  console.log(resolved.metadata.description); // discoverable, human-readable
}

// Execution still only ever flows through the registry (directly, or via
// the SDK's fluent façade) — resolveCatalogEngine never executes anything.
const ai = new AIBuilder().provider(new GeminiProvider({ apiKey: '...' })).engine(documentExtractEngine).build();
const result = await ai.engine('document.extract').execute('report.pdf');
```

`resolveCatalogEngine`'s registry parameter accepts anything shaped like
`{ get(id): TEngine | undefined }` — a real `EngineRegistry` already
satisfies this structurally, so `@aidex/catalog` never needs to import
`@aidex/engines` itself.

## Design decisions

**Zero dependency on any Feature Pack.** `@aidex/catalog` depends on
`@aidex/core` and `@aidex/providers` only (for `DuplicateRegistrationError`, reused rather than
inventing a bespoke duplicate error — the same class `StrategyRegistry`/
`PluginRegistry`/`EngineRegistry`/`PromptRegistry`/`ToolRegistry` all
already throw). It never imports `@aidex/document`, `@aidex/content`, or
`@aidex/engines` — a metadata registry that had to know about every Feature
Pack in existence wouldn't let "future Feature Packs only add metadata
entries" (requirement 8) actually hold.

**Registration is explicit, not automatic.** There's no side-effecting
"import this and it registers itself" module, and no global catalog
singleton a Feature Pack could reach out and mutate. An application
constructs its own `EngineCatalog` and decides what goes into it —
consistent with `@aidex/sdk`'s `AIBuilder` never using a singleton either.

**`DuplicateRegistrationError` not re-exported.** Consumers who want to
catch it import it from `@aidex/core` directly — the same convention
`@aidex/tools`, `@aidex/prompts`, and `@aidex/engines` already follow; none
of them re-export it from their own index either.

**Zero dependency on `@aidex/engines`.** `resolveCatalogEngine` takes a
minimal structural `EngineLookup<TEngine>` contract instead of `@aidex/engines`'
own `EngineRegistry` type — any `EngineRegistry` instance satisfies it without
this package ever importing `@aidex/engines`, keeping the registry-integration
requirement met without adding a dependency edge. `@aidex/providers` is a
type-only dependency, used only for the `ProviderCapability` type behind
`requiredCapabilities`.

**Categories/tags are cross-pack vocabulary, not per-pack namespaces.**
`document.translate` and `content.translate` both carry
`category: 'translation'` — the value of `findByCategory()` comes
specifically from it grouping engines *across* Feature Packs, not just
within one.
