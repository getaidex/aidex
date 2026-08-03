# @aidex/examples

Short, independent, buildable programs demonstrating each Aidex capability
through public APIs — never internal/private classes. Each example is a
single file, 25–60 lines, that runs standalone.

## Running an example

```sh
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples hello-world
```

Every example has its own npm script (`hello-world`, `custom-provider`,
`custom-engine`, `plugin`, `workflow`, `prompt-registry`, `tool-registry`,
`observability`) that runs its compiled output directly:
`node dist/<folder>/index.js`.

## The examples

| # | Folder | Demonstrates |
|---|---|---|
| 1 | `01-hello-world/` | `AIBuilder` (from `@aidex/sdk`) assembling an `Aidex` instance around `GeminiProvider`, then `ai.text()`. Falls back to `StubProvider` when `GEMINI_API_KEY` isn't set, so it always runs; set a real key to see it call Gemini. |
| 2 | `02-custom-provider/` | Implementing `Provider` yourself (a deterministic string-reverser, no vendor SDK), registering it via `AIBuilder.provider()`, and executing a request. `Provider` is imported from `@aidex/sdk` itself. |
| 3 | `03-custom-engine/` | Implementing `Engine`, registering it into an `EngineRegistry`, and executing it by id. Engines dispatch independently of `Aidex.execute()` — this builds a minimal `ExecutionContext` by hand rather than going through the SDK. |
| 4 | `04-plugin/` | One `ExtendedPlugin` declaring an Engine, a Prompt, and a Tool all at once; `PluginManager.use()` registers each into its real registry (`EngineRegistry`/`PromptRegistry`/`ToolRegistry`) in a single call. |
| 5 | `05-workflow/` | `Workflow` + `WorkflowExecutor`: a 3-step sequential pipeline with `onEvent` observability callbacks, then a separate cancellation example using `AbortController`. |
| 6 | `06-prompt-registry/` | Registering two versions of the same prompt id, rendering the latest by default, rendering an explicit older version, and listing all versions. |
| 7 | `07-tool-registry/` | Registering a permission-gated `Tool`, executing it with the required permission granted, and the `ToolPermissionDeniedError` path when it isn't. |
| 8 | `08-observability/` | `ObservabilityBus.subscribe()`/`.trackProvider()`/`.trackTokens()`/`.trackDurationFromMetrics()`/`.trackCostFromEstimate()`, and reading back the full ordered `getTimeline()`. |

## Design notes

- **Independent**: no example imports another; each is a self-contained
  entry point under `src/<number>-<name>/index.ts`.
- **Public API only, with one documented exception**: every example imports
  from a package's `index.ts` barrel, never a deep/internal path. The one
  case that reaches `@aidex/core` directly (`04-plugin/`) is because
  `PluginManager` currently composes a raw `Aidex` instance, not the SDK's
  `AI` façade — see "Limitations discovered" below.
- **`Provider`/`Plugin` come from `@aidex/sdk`**, not `@aidex/core`, wherever
  the example only needs the SDK — demonstrating the SDK's own re-exported
  types rather than reaching past it.
- Examples that need a shared kernel type not exposed by the SDK
  (`ExecutionContext`, used to build a context for `EngineRegistry.execute()`
  directly) import it from `@aidex/core`, since no SDK equivalent exists for
  that use case yet.

## Limitations discovered

- **`PluginManager` requires a raw `Aidex` instance**, not the SDK's `AI`
  façade — `@aidex/sdk`'s `AI` class wraps `Aidex` privately with no accessor
  to extract it, and `AIBuilder` has no method to attach a `PluginManager`.
  The plugin example (`04-plugin/`) therefore constructs `Aidex` directly,
  the only example that does. If the SDK grows plugin-manager support, this
  example would be the one to simplify.
- **`EngineRegistry` isn't wired into `Aidex.execute()`**, and the SDK has no
  façade over it either — `03-custom-engine/` and `04-plugin/` both build an
  `ExecutionContext` by hand to call `registry.execute()` directly. This is
  by design (engines dispatch independently of the Strategy pipeline), but
  it means "run an engine" has no one-line SDK equivalent to `ai.text()`.
- **`GeminiProvider`'s automatic observability wiring couldn't be
  demonstrated live** without either a real `GEMINI_API_KEY` (not available
  in this environment, and not something to spend without authorization) or
  a network-boundary mock (not a legitimate pattern to show end users in a
  production example). `08-observability/` instead drives `ObservabilityBus`
  directly, which exercises the exact same four `track*` methods
  `GeminiProvider` calls internally — just without a real HTTP round trip.
