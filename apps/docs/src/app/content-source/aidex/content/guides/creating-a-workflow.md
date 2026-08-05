# Creating a Workflow

`@aidex/workflow` gives you an ordered sequence of steps (`Workflow`), the
contract each step satisfies (`WorkflowStep`), the shared state threaded
between them (`WorkflowContext`), and a minimal sequential runner
(`WorkflowExecutor`). It has no dependency on `@aidex/core` or any other
Aidex package — every type is self-contained and generic over your own
`TState`.

## Define your steps

```ts
import type { WorkflowStep } from '@aidex/workflow';

interface MyState {
  input: string;
  result?: string;
}

const stepOne: WorkflowStep<MyState> = {
  name: 'normalize-input',
  async execute(context) {
    context.input = context.input.trim().toLowerCase();
  },
};

const stepTwo: WorkflowStep<MyState> = {
  name: 'produce-result',
  async execute(context) {
    context.result = `handled: ${context.input}`;
  },
};
```

`WorkflowContext<TState>` is just `TState` — steps communicate forward by
mutating it in place.

## Build and run the workflow

```ts
import { Workflow, WorkflowExecutor } from '@aidex/workflow';

const workflow = new Workflow('my-workflow');
workflow.addStep(stepOne);
workflow.addStep(stepTwo);

const executor = new WorkflowExecutor();
const context: MyState = { input: '  Hello World  ' };

await executor.execute(workflow, context);
console.log(context.result); // "handled: hello world"
```

Steps run strictly in order, each `await`ed before the next starts. If a
step throws, execution stops immediately — no later step runs, and the
rejection propagates to your `execute()` call. There is no retry, no
parallelism, no branching, and no persistence: this is a sequencing
primitive, not a workflow engine with its own DSL.

## Cancellation

`execute()` takes an optional third argument, `{ signal?: AbortSignal }`,
checked before each step and raced against an in-flight one — so aborting
stops execution promptly even if the current step's promise never settles
on its own. A cancelled run rejects with `WorkflowCancelledError`.

## Observing progress

Pass `onEvent` in the same options object to receive `WorkflowEvent`s —
`workflow-started`, `step-started`, `step-completed`, `step-failed`,
`workflow-cancelled`, `workflow-completed` — as a plain callback. The
executor never logs or persists anything itself; this hook is how a caller
(or a future observability layer) taps in.

## Running many workflows by id

`WorkflowRegistry` (patterned after `EngineRegistry`) lets you register
several workflows and dispatch by id instead of holding direct references:

```ts
import { WorkflowRegistry } from '@aidex/workflow';

const registry = new WorkflowRegistry();
registry.register(workflow); // workflow.id must be set
await registry.execute('my-workflow', context);
```

`register()` throws if `workflow.id` is unset, or `WorkflowAlreadyRegisteredError`
for a duplicate id. `execute()` throws `WorkflowNotFoundError` for an unknown
id, and otherwise delegates entirely to `WorkflowExecutor`.

See [11 — Workflow Orchestration](/examples/11-workflow-orchestration) for a
full runnable walkthrough with real step dependencies and cancellation.
