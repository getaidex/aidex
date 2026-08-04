# 11 — Workflow Orchestration

**Level 6 · Workflow · Advanced · ~15 min**

## What problem does this solve?
A real document-processing job is rarely one call — it's several steps
where later steps depend on earlier results, need to run in order, and
should be cancellable if the caller gives up.

## Why would I use this Aidex feature?
`Workflow`/`WorkflowExecutor` from `@aidex/workflow` give you a small,
generic step-runner: each `WorkflowStep` mutates a shared state object,
`onEvent` reports progress (`step-started`/`step-completed`/etc.), and
an `AbortSignal` can cancel mid-run. This example's `translate` step
literally consumes `summarize`'s output — a real dependency chain, not
four calls run one after another for show.

## When should I use this in a real project?
Any multi-stage document/content pipeline with real step dependencies
and a need for cancellation or progress reporting — batch processing
jobs, ingestion pipelines.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider with canned
  per-step JSON)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples workflow-orchestration
```

## Expected output
A stream of `[workflow event] ...` lines as each step runs, then the
extracted fields, summary, Spanish translation of that summary, and
review findings — followed by a demonstration of immediate cancellation
raising `WorkflowCancelledError`.

## Concepts learned
- `Workflow<TState>` + `WorkflowStep` + `WorkflowExecutor.execute(workflow, state, {onEvent, signal})`
- Real step-to-step data dependencies (state mutated across steps)
- Cancellation via `AbortController`/`AbortSignal` and `WorkflowCancelledError`

## Related packages
`@aidex/workflow`, `@aidex/document`, `@aidex/sdk`

## Next example
[12 — Plugin Example](../12-plugin-example/README.md) — a different
composition mechanism: registering engines/prompts/tools via a plugin.
