# @aidex/sdk

## Installation

```sh
pnpm add @aidex/sdk
```

```sh
npm install @aidex/sdk
```

**Kernel = architecture. SDK = developer experience.**

`@aidex/core` is the frozen, minimal kernel — `new Aidex(config)`, `.use()`,
`.registerStrategy()`, `.execute()` — deliberately small so it can stay
stable for years. That stability comes at a cost: using it directly means a
developer has to know about providers, strategies, and plugins as separate
concepts before they can generate one line of text.

`@aidex/sdk` hides that assembly behind a friendly façade. Instead of:

```ts
const aidex = new Aidex({ provider: new GeminiProvider(...) });
aidex.use(loggerPlugin);
aidex.registerStrategy(new TextGenerationStrategy());
const result = await aidex.execute({ strategy: 'text-generation', input: 'hi' });
```

an application writes:

```ts
import { AIBuilder } from '@aidex/sdk';

const ai = new AIBuilder().provider(new GeminiProvider(...)).build();
const result = await ai.text('hi');
```

## Contents

- **`AI`** — the main façade. Holds exactly one `Aidex` instance and
  delegates every call to it: `execute(request)` passes a raw `AidexRequest`
  straight through; `text(input)` is a convenience that calls
  `kernel.execute({ strategy: 'text-generation', input })`. Neither method
  contains strategy logic of its own — both simply delegate.
- **`AIBuilder`** — a builder over `Aidex`. `.provider(p)` / `.plugin(p)`
  accumulate configuration (both return `this`); `.build()` constructs the
  underlying `Aidex`, auto-registers `@aidex/strategies`'
  `TextGenerationStrategy` under the name `"text-generation"` (the one piece
  of wiring this façade hides so `ai.text()` works without the developer ever
  calling `registerStrategy()`), and returns a ready-to-use `AI`. Throws a
  descriptive `Error` if no provider was configured. Can also be seeded via
  its constructor: `new AIBuilder({ provider, plugins })`.
- **`AIBuilder.plugin(plugin)`** — unchanged lifecycle behavior: pushes onto
  a private `Plugin[]` fed into `AidexConfig.plugins`, so `Aidex`'s own
  constructor calls `use(plugin)` exactly once per entry, wiring lifecycle
  hooks the same way it always has. Additionally, if the plugin also
  satisfies `@aidex/plugins`' `ExtendedPlugin` shape (i.e. it declares any of
  `registerEngines()`/`registerStrategies()`/`registerPrompts()`/
  `registerTools()`), every item each declared method returns is fanned out
  immediately: engines/prompts/tools are routed through this same builder's
  own `.engine()`/`.prompt()`/`.tool()` — so they land in the exact same
  `EngineRegistry`/`PromptRegistry`/`ToolRegistry` a direct call to those
  methods would use, with the same duplicate-id validation. Strategies have
  no public single-item registration method on `AIBuilder`, so they're
  collected into a private, SDK-internal `Map<string, Strategy>` — never
  exported, never part of any public method signature — keyed by
  `strategy.name` (not an `id`; this matches the kernel's own
  `registerStrategy()` convention), with duplicate names rejected
  immediately via `@aidex/core`'s `DuplicateRegistrationError`. That
  collection is only replayed onto the kernel inside `.build()`, in
  registration order, immediately after the auto-registered
  `TextGenerationStrategy` — so a plugin-declared strategy is registered
  exactly once, at the same point in the lifecycle every other strategy is.
  `AIBuilder` deliberately never instantiates or calls `@aidex/plugins`'
  `PluginManager` to do this fan-out: `PluginManager`'s constructor requires
  an already-built `Aidex` instance, which doesn't exist yet at the point
  `.plugin()` is called — `Aidex` isn't constructed until `.build()` runs.
  Even if it were available sooner, calling `PluginManager.use(plugin)`
  would call `aidex.use(plugin)` a second time, since `Aidex`'s own
  constructor already calls `use()` once per `config.plugins` entry —
  duplicating lifecycle-hook execution for every plugin. This is a
  permanent design decision, not a gap to close: `AIBuilder` instead
  reproduces only `PluginManager`'s registration fan-out, routed through
  its own existing public methods, without ever holding or delegating to a
  `PluginManager` object. `PluginManager` itself remains the correct,
  unmodified composition point for application code that already holds a
  raw `Aidex` instance directly (outside of `AIBuilder`).
- **`AIConfiguration`** — the lightweight shape `AIBuilder`'s constructor
  accepts: `{ provider: Provider; plugins?: Plugin[] }`. Developer-facing
  configuration only — no vendor-specific settings, no application settings.
- **`AIBuilder.engine(engine)`** — accumulates `Engine`s (from `@aidex/engines`) into a private `EngineRegistry`, fluent (returns `this`, same as `.provider()`/`.plugin()`). Duplicate ids throw `@aidex/core`'s reused `DuplicateRegistrationError` (via `EngineRegistry.register()` — no new validation here).
- **`AI.engine(engineId)`** — returns an `EngineHandle` scoped to that id. `EngineHandle.execute(input?)` delegates directly to `EngineRegistry.execute()`, including its capability validation (`UnsupportedProviderCapabilityError` if the configured provider doesn't support what the engine requires) and its `EngineNotFoundError` for an unregistered id — neither is caught or wrapped here.
- **`AIBuilder.workflow(workflow)`** — accumulates `Workflow`s (from `@aidex/workflow`) into a private `WorkflowRegistry`, fluent (returns `this`, same as `.provider()`/`.engine()`). Duplicate ids throw `@aidex/workflow`'s package-local `WorkflowAlreadyRegisteredError` (not `@aidex/core`'s `DuplicateRegistrationError` — this package deliberately has no dependency on the kernel), via `WorkflowRegistry.register()` — no new validation here.
- **`AI.workflow(workflowId)`** — returns a `WorkflowHandle` scoped to that id. `WorkflowHandle.execute(input?)` builds and injects the frozen `AidexWorkflowContext` under `context.$aidex` — carrying `context.$aidex.provider` — before delegating to `WorkflowRegistry.execute()`, which itself stays provider-unaware. The fields on `$aidex` (`provider`, `config`, `logger`, `metadata`) are frozen via `Object.freeze()` and typed `readonly`, so workflow steps cannot modify them. The `$aidex` property itself is reserved by the SDK; applications should never define or reassign it in workflow state, even though TypeScript does not enforce that at the type level.
- **`AIBuilder.prompt(prompt)`** — accumulates `PromptTemplate`s (from `@aidex/prompts`) into a private `PromptRegistry`, fluent (returns `this`, same as `.provider()`/`.engine()`/`.workflow()`). Duplicate `id@version` pairs throw `@aidex/core`'s `DuplicateRegistrationError` via `PromptRegistry.register()` — no new validation here.
- **`AI.renderPrompt(id, variables?, version?)`** — looks up the prompt (defaulting to whichever version was most recently registered for that `id`) and renders it, substituting `variables` into the template. Delegates entirely to `PromptRegistry.render()`; throws `@aidex/prompts`' `PromptNotFoundError`/`MissingPromptVariableError` unmodified.
- **`AI.prompts()`** — returns the underlying `PromptRegistry` itself, for callers that want `.get()`/`.has()`/`.listVersions()`/`.list()` instead of the render-only convenience above.
- **`AIBuilder.tool(tool)`** — accumulates `Tool`s (from `@aidex/tools`) into a private `ToolRegistry`, fluent (returns `this`, same as `.provider()`/`.engine()`/`.workflow()`/`.prompt()`). Duplicate `id`s throw `@aidex/core`'s reused `DuplicateRegistrationError` via `ToolRegistry.register()` — no new validation here.
- **`AI.tools()`** — returns the underlying `ToolRegistry` itself, so callers can `.get()`/`.has()`/`.list()`/`.listByPermission()`/`.execute(id, input, grantedPermissions?)` — including the registry's own permission-gated execution (`ToolPermissionDeniedError` if a caller doesn't hold every permission a tool declares) — without this façade reimplementing any of it.
- **`AI.catalog()`** — returns the underlying `EngineCatalog` (from `@aidex/catalog`) assembled at `build()` time, so callers can `.find(id)` / `.findByCategory()` / `.findByTag()` / `.findByFeaturePack()` / `.list()` engine metadata without ever executing anything.
- **`FeaturePackage`** — a feature pack's complete, hand-assembled manifest: `{ name, version, engines?, prompts?, plugins?, metadata?, workflows? }`. `version` is the manifest's own version string (independent of any individual engine's or prompt's `version` field). **`AIBuilder.use(featurePackage)`** fans a `FeaturePackage` into this builder's existing registries in one call — every entry in `engines`/`prompts`/`plugins`/`metadata` is passed to `.engine()`/`.prompt()`/`.plugin()`/the internal catalog respectively, so `.use(pack).use(otherPack)` composes the same way calling `.engine()`/`.prompt()` individually would. `workflows` is deliberately **not** touched by `.use()` — feature-pack workflow helpers predate `@aidex/workflow`'s `Workflow`/`WorkflowRegistry` and have their own `run(input, provider, options)` shape; a manifest's `workflows` field exists only so an application can discover and invoke them directly, via each workflow's own native API. Every `Engine` in a manifest's `engines` is a **singleton** — the exact same instance is shared across every registry that registers it, so engine implementations must stay **stateless**: all execution state belongs on `ExecutionContext`, never on the `Engine` instance itself.

## What this package is not

Not the kernel, not an AI provider, not an MCP implementation. It assembles
the packages that already exist (`@aidex/core`, `@aidex/strategies`, `@aidex/engines`,
and whatever concrete `Provider`/`Plugin` the application supplies) into one
convenient surface, and contains no business logic of its own. It knows
nothing about Gemini, OpenAI, Design Platform, or Print Platform.

## Public API

```ts
import {
  AI,
  AIBuilder,
  EngineHandle,
  WorkflowHandle,
  AIConfiguration,
  type Provider,
  type Plugin,
  type Engine,
  type Workflow,
  type AidexWorkflowContext,
  type FeaturePackage,
  type PromptTemplate,
  type PromptRegistry,
  type EngineMetadata,
  type EngineCatalog,
  type Tool,
  type ToolRegistry,
} from '@aidex/sdk';
```

`Provider` and `Plugin` are re-exported because they're direct parameter
types of this SDK's own public methods (`AIBuilder.provider()`/`.plugin()`,
`AIConfiguration.provider`/`.plugins`) — a developer authoring a custom
`Provider` or `Plugin` to pass into this SDK can now do so without ever
importing `@aidex/core` directly, closing a gap where the SDK's own
"applications never need to import `@aidex/core`" promise didn't hold for
exactly the case it exists to support.

`Engine` is re-exported for the identical reason: it's a direct parameter
type of `AIBuilder.engine()`. `EngineHandle` is re-exported because it's
the direct return type of `AI.engine()` — a developer receiving or working
with that return value doesn't need to import `@aidex/engines` directly.

`Workflow` is re-exported for the identical reason: it's a direct parameter
type of `AIBuilder.workflow()`. `WorkflowHandle` is re-exported because it's
the direct return type of `AI.workflow()` — a developer receiving or working
with that return value doesn't need to import `@aidex/workflow` directly.
`AidexWorkflowContext` is re-exported because it's the type of the execution
context each workflow step receives. The fields on `$aidex` (`provider`, `config`,
`logger`, `metadata`) are frozen via `Object.freeze()` and typed `readonly`.
The `$aidex` property itself is reserved by the SDK; applications should never
define or reassign it in workflow state, even though TypeScript does not enforce
that at the type level.

`PromptTemplate` is re-exported because it's a direct parameter type of
`AIBuilder.prompt()` (and of `FeaturePackage.prompts`); `PromptRegistry` is
re-exported because it's the direct return type of `AI.prompts()`.
`PromptNotFoundError`/`MissingPromptVariableError`/`InvalidPromptError` are
deliberately **not** re-exported — same precedent as every other domain
error below; callers who need `instanceof` on these import `@aidex/prompts`
directly.

`EngineMetadata` is re-exported because it's a direct parameter type of
`FeaturePackage.metadata`; `EngineCatalog` is re-exported because it's the
direct return type of `AI.catalog()`.

`Tool` is re-exported because it's a direct parameter type of
`AIBuilder.tool()` (and, indirectly, of `ExtendedPlugin.registerTools()`,
consumed internally by `.plugin()`); `ToolRegistry` is re-exported because
it's the direct return type of `AI.tools()`. `ToolNotFoundError`/
`ToolPermissionDeniedError` are deliberately **not** re-exported — same
precedent as every other domain error below; callers who need `instanceof`
on these import `@aidex/tools` directly.

`FeaturePackage` is re-exported because it's the direct parameter type of
`AIBuilder.use()` — a feature pack authoring its own manifest constant (or
an application assembling one inline) needs this type without importing
`@aidex/sdk`'s internals.

`Strategy` is deliberately **not** re-exported: nothing in this SDK's
public surface accepts one today — `AIBuilder` has no `.strategy()` method,
only `@aidex/strategies`' `TextGenerationStrategy` is auto-registered
internally. This remains true even though `.plugin()` now understands
`@aidex/plugins`' `ExtendedPlugin.registerStrategies()`: that method is
`@aidex/plugins`' own type surface, consumed by `AIBuilder.plugin()`
purely internally (see the bulk-registration description above) — it is
never re-exported by `@aidex/sdk`, and the strategies it yields land in a
private, SDK-internal collection with no public getter. Exporting a type
with no corresponding way to use it directly would itself be exposing an
unnecessary type. Revisit if `AIBuilder` ever grows a way to register a
custom `Strategy` directly.

Nothing else is exported — no `Aidex`, no kernel errors, no internal kernel
classes (`Lifecycle`, `StrategyRegistry`, `PluginRegistry` were never public
in `@aidex/core` either, and this package doesn't change that). Engine
internals like `EngineRegistry`, `EngineNotFoundError`, and
`UnsupportedProviderCapabilityError` are also not re-exported — callers who
need instanceof checks on those errors import them directly from `@aidex/engines`,
the same as they would for kernel errors from `@aidex/core` today. Similarly,
workflow internals like `WorkflowRegistry`, `WorkflowNotFoundError`, and
`WorkflowAlreadyRegisteredError` are not re-exported — callers who need
instanceof checks on those errors import them directly from `@aidex/workflow`.
The same applies to prompt/catalog internals: `PromptNotFoundError`,
`MissingPromptVariableError`, and `InvalidPromptError` are not re-exported
(import them from `@aidex/prompts`), and `@aidex/catalog`'s own
`DuplicateRegistrationError` re-export precedent (it doesn't re-export one
either — see that package's own README) is followed here too. Likewise,
tool internals `ToolNotFoundError` and `ToolPermissionDeniedError` are not
re-exported — callers who need instanceof checks on those import them
directly from `@aidex/tools`, the same as every other domain error above.

## Architecture rules this package follows

- Composition only — `AIBuilder` and `AI` each hold/compose an `Aidex`
  instance; no inheritance, no abstract base class.
- No singleton, no global mutable state, no factory functions — getting an
  `AI` requires either `new AIBuilder(...).build()` or `new AI(existingKernel)`,
  both plain constructor calls.
- Never duplicates logic already implemented by `Aidex`, a `Strategy`, or a
  `Plugin` — `AIBuilder.build()` calls `new Aidex(...)` and
  `registerStrategy()` exactly once each; `AI.text()`/`AI.execute()` are
  one-line delegations.
- No provider construction inside the SDK — `AIBuilder.provider()` only ever
  accepts an already-constructed `Provider` the application supplies.

## Executing an Engine

```ts
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: '...' }))
  .engine({
    id: 'document.extract',
    name: 'Document Extract',
    description: 'Extracts text from a document',
    version: '1.0.0',
    async execute(context) {
      // context.provider, context.request?.input, etc. — the same
      // ExecutionContext shape a Strategy receives.
      return `extracted: ${context.request?.input}`;
    },
  })
  .build();

const result = await ai.engine('document.extract').execute('report.pdf');
```

## Capability Validation

An Engine can declare `requiredCapabilities` (from `@aidex/providers`'
`ProviderCapability`). `AI.engine(id).execute()` rejects with
`UnsupportedProviderCapabilityError` (from `@aidex/engines`) before the
engine ever runs, if the configured provider doesn't support everything
it requires — the same validation `EngineRegistry.execute()` always
performs, not reimplemented here.

```ts
import { ProviderCapability } from '@aidex/providers';

const ai = new AIBuilder()
  .provider(new StubProvider()) // only supports text-generation
  .engine({
    id: 'video.transcribe',
    name: 'Video Transcribe',
    description: 'Transcribes video audio',
    version: '1.0.0',
    requiredCapabilities: [ProviderCapability.Streaming],
    async execute() {
      /* ... */
    },
  })
  .build();

await ai.engine('video.transcribe').execute(someVideo);
// rejects with UnsupportedProviderCapabilityError
```

## Executing a Workflow

```ts
import { AIBuilder, type AidexWorkflowContext } from '@aidex/sdk';
import { Workflow } from '@aidex/workflow';
import { GeminiProvider } from '@aidex/providers';

interface ResumeReviewState {
  documentId: string;
}

const workflow = new Workflow<ResumeReviewState & { $aidex: AidexWorkflowContext }>('resume-review');
workflow.addStep({
  name: 'parse',
  async execute(context) {
    // context.documentId is the value passed to execute() below
    // context.$aidex.provider is the exact Provider configured below
  },
});

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: '...' }))
  .workflow(workflow)
  .build();

const result = await ai.workflow('resume-review').execute({ documentId: 'r-1' });
```

## Registering a Feature Package

A `FeaturePackage` bundles everything a feature pack offers — engines,
prompts, plugins, and discoverable metadata — into one manifest that
`AIBuilder.use()` fans into this builder's existing registries in a single
call. This example builds one inline; a real feature pack (e.g.
`@aidex/document`) would export a manifest constant of this same shape for
an application to import and pass to `.use()` directly.

```ts
import { AIBuilder, type FeaturePackage } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const documentFeaturePack: FeaturePackage = {
  name: 'document',
  version: '1.0.0',
  engines: [
    {
      id: 'document.extract',
      name: 'Document Extract',
      description: 'Extracts text from a document',
      version: '1.0.0',
      async execute(context) {
        return `extracted: ${context.request?.input}`;
      },
    },
  ],
  prompts: [
    {
      id: 'document.summarize',
      version: '1.0.0',
      template: 'Summarize the following text: {{text}}',
      variables: ['text'],
    },
  ],
  metadata: [
    {
      id: 'document.extract',
      name: 'Document Extract',
      featurePack: 'document',
      version: '1.0.0',
      description: 'Extracts text from a document',
      requestType: 'string',
      responseType: 'string',
      tags: ['document'],
      category: 'extraction',
    },
  ],
};

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: '...' }))
  .use(documentFeaturePack)
  .build();

const result = await ai.engine('document.extract').execute('report.pdf');
console.log(ai.catalog().findByCategory('extraction'));
console.log(ai.renderPrompt('document.summarize', { text: '...' }));
```

Every `Engine` inside a `FeaturePackage` is constructed once and shared as
a singleton across every registry that registers it — engines must stay
stateless, with all execution state living on `ExecutionContext`, never on
the engine instance itself. `documentFeaturePack.version` above is the
manifest's own version, independent of the `version` field on each
individual engine or prompt entry.

## Registering a Tool

```ts
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: '...' }))
  .tool({
    id: 'calculator',
    name: 'calculator',
    description: 'Evaluates a simple arithmetic expression',
    async execute(input: string) {
      return String(eval(input));
    },
  })
  .build();

console.log(await ai.tools().execute('calculator', '2 + 2'));
```

(This example is illustrative of the API shape only — it is not asserted
against in any test, matching how other README usage snippets in this file
are presented.) `ai.tools()` returns the same `ToolRegistry` `.tool()`
registers into, so `.get()`/`.has()`/`.list()`/`.listByPermission()` are
also available on it; `.execute()`'s third, optional `grantedPermissions`
argument is only relevant for tools that declare a `permissions` array —
`calculator` above declares none, so it runs unconditionally.

## Bulk-Registering via a Plugin

A plugin can declare engines, prompts, tools, and strategies all at once by
also satisfying `@aidex/plugins`' `ExtendedPlugin` interface — `.plugin()`
recognizes this automatically, with no separate registration call needed:

```ts
import { AIBuilder } from '@aidex/sdk';
import type { ExtendedPlugin } from '@aidex/plugins';
import { GeminiProvider } from '@aidex/providers';

const myPlugin: ExtendedPlugin = {
  name: 'my-plugin',
  registerTools() {
    return [
      {
        id: 'calculator',
        name: 'calculator',
        description: 'Evaluates a simple arithmetic expression',
        async execute(input: string) {
          return String(eval(input));
        },
      },
    ];
  },
  // registerEngines()/registerPrompts()/registerStrategies() are equally
  // optional — declare any subset.
};

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: '...' }))
  .plugin(myPlugin)
  .build();

console.log(await ai.tools().execute('calculator', '2 + 2'));
```

`registerEngines()`/`registerPrompts()`/`registerTools()` entries are
routed through `.engine()`/`.prompt()`/`.tool()` respectively — the exact
same registries and duplicate-id validation a direct call to those methods
would use. `registerStrategies()` entries have no public single-item
registration method to route through, so they're instead collected into a
private, SDK-internal map keyed by `strategy.name` and are only applied to
the kernel inside `.build()`, immediately after the auto-registered
`TextGenerationStrategy` — see `AIBuilder.plugin(plugin)` above for why
this is a private collection rather than a public one, and why `AIBuilder`
reproduces this fan-out itself instead of delegating to
`@aidex/plugins`' `PluginManager`.

## Dependency direction

`@aidex/sdk` is the top of the *runtime* dependency graph. Runtime
dependencies: `@aidex/core` and `@aidex/strategies` (for the auto-registered
`TextGenerationStrategy`), `@aidex/engines` (for engine registration and
dispatch), `@aidex/workflow` (for workflow registration and execution),
`@aidex/prompts` (for prompt registration and rendering), `@aidex/catalog`
(for engine-metadata discovery), and `@aidex/tools` (for tool registration
and permission-gated execution). `@aidex/plugins` is also listed as a
dependency, but only for its `ExtendedPlugin` type — `AIBuilder.ts` imports
it with `import type`, which compiles away completely; nothing in this
package's runtime code calls into `@aidex/plugins`' own code (its
`PluginManager` is deliberately never instantiated here — see
`AIBuilder.plugin()` above). `@aidex/providers` is a devDependency only,
used by this package's own test suite (`StubProvider`); the test suite also
imports `@aidex/plugins`' `StubPlugin` as a value, which is covered by the
`@aidex/plugins` dependency already listed above. No dependency on
`@aidex/memory` or `@aidex/observability` — those integrate later.

Feature packages (`@aidex/document`, `@aidex/content`, `@aidex/design`,
`@aidex/media`, `@aidex/marketing`) declare `@aidex/sdk` as a dependency
**for its exported types only** — specifically `FeaturePackage`, the
manifest shape their `featurePackage.ts` constant is typed against
(`import type { FeaturePackage } from '@aidex/sdk'`). This is an
intentional, approved exception, not drift: every such import is
`import type`, never a runtime value import, so it compiles away
completely and introduces **no runtime coupling** — nothing in a feature
pack calls into `@aidex/sdk` code at execution time. The dependency arrow
still points one way: `@aidex/sdk` never imports any feature package, in
either direction, so the runtime graph stays acyclic — feature pack →
`@aidex/sdk` (type-only) → `@aidex/core`/`@aidex/engines`/`@aidex/workflow`/
`@aidex/prompts`/`@aidex/catalog`, with no edge back from `@aidex/sdk` to any
feature pack.
