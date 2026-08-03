# @aidex/workflow

## Installation

```sh
pnpm add @aidex/workflow
```

```sh
npm install @aidex/workflow
```

Reusable workflow primitives for Aidex: an ordered sequence of steps
(`Workflow`), the contract each step satisfies (`WorkflowStep`), the shared
state threaded between them (`WorkflowContext`), and a minimal sequential
runner (`WorkflowExecutor`).

## Contents

- **`workflow/Workflow`** — maintains an ordered list of `WorkflowStep`s.
  Constructor accepts an optional `id: string` parameter (backward-compatible —
  omitting it works exactly as before). `addStep()` appends, `getSteps()`
  returns a snapshot. No execution logic of its own.
- **`step/WorkflowStep`** — the contract only: `{ name: string; execute(context):
  Promise<void> }`. No implementation ships here.
- **`types/WorkflowContext`** — a generic, provider- and application-independent
  bag of shared state (`WorkflowContext<TState> = TState`). Steps typically
  communicate forward by mutating it in place.
- **`executor/WorkflowExecutor`** — runs a `Workflow`'s steps sequentially
  against one shared `WorkflowContext` instance, `await`ing each step in
  order. Stops immediately (the rejection propagates) if a step throws — no
  later step runs. No retry, no parallelism, no branching, no persistence, no
  logging.
- **`WorkflowCancelledError`** / **cancellation** — `execute()` takes an
  optional third `options` argument: `{ signal?: AbortSignal }`. Checked
  before each step, and raced against an in-flight one, so aborting stops
  execution promptly even if the current step's own promise never settles.
  Fully backward-compatible — omitting `options` behaves exactly as before.
- **`registry/WorkflowRegistry`** — id-keyed registry for managing a set of
  workflows, patterned after `EngineRegistry`. Methods: `register(workflow)`
  (requires `workflow.id` to be set; throws `Error` if not, `WorkflowAlreadyRegisteredError`
  if the id is already registered), `unregister(id)`, `has(id)`, `get(id)`, `list()`, and `execute(id,
  context, options)` (throws `WorkflowNotFoundError` if not found; delegates entirely to `WorkflowExecutor`, never
  reimplementing step-running).
- **`WorkflowEvent`** / **observability events** — `options.onEvent?: (event:
  WorkflowEvent) => void` is an opt-in callback firing `workflow-started`,
  `step-started`, `step-completed`, `step-failed` (carries the thrown
  error), `workflow-cancelled` (carries the `WorkflowCancelledError`), and
  `workflow-completed`. The executor never logs or persists anything itself
  — this is a plain hook a caller (or a future observability layer) can
  subscribe to.

## Independence

This package knows nothing about Gemini, OpenAI, Claude, Ollama, Design Platform,
Print Platform, or any other application or vendor — it only coordinates the order
steps run in and the context they share. It has no runtime dependency on
`@aidex/core` (or any other Aidex package): every type here is self-contained
and generic over the caller's own `TState`. Adding `WorkflowRegistry` did not
change this — `WorkflowAlreadyRegisteredError` is defined package-locally
specifically to preserve the zero-Aidex-dependency design.

## Architecture rules this package follows

- Composition only — no inheritance, no abstract base class.
- No singletons, no global mutable state — `Workflow` and `WorkflowExecutor`
  are both plain classes instantiated by the caller.
- `src/index.ts` exports `Workflow`, `WorkflowExecutor`, `WorkflowCancelledError`,
  `WorkflowRegistry`, `WorkflowNotFoundError`, `WorkflowAlreadyRegisteredError`,
  and the `WorkflowStep`/`WorkflowContext`/`WorkflowEvent`/`WorkflowEventType`/
  `WorkflowExecutionOptions` types — nothing internal beyond that.

## Dependency direction

`@aidex/workflow` has no dependency on `@aidex/providers`, `@aidex/strategies`,
`@aidex/plugins`, `@aidex/observability`, or any future `memory`/`sdk` package —
and none on `@aidex/core` either, since nothing in this package's design needs
a kernel type. It is a standalone orchestration primitive any of those
packages (or an application) could depend on, never the other way around.
