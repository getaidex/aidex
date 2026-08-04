# Aidex Examples

A hands-on course, not a reference dump. Each example is a small, real
program — runnable immediately, most requiring zero setup (they fall
back to demo/stub behavior without a `GEMINI_API_KEY`, and always say
so out loud when they do).

New to Aidex and want working code in one sitting before committing to
the full course? Start with
[BUILD-YOUR-FIRST-AIDEX-APP.md](BUILD-YOUR-FIRST-AIDEX-APP.md).

## Prerequisites

- Node ≥18, pnpm
- From the repo root: `pnpm install` then `pnpm --filter @aidex/examples build`
- Optional: `export GEMINI_API_KEY=...` — every example works without
  it (demo mode), and upgrades automatically to real output with it.

## Learning path

```
Level 1  Getting Started   →  01, 02, 03
Level 2  Providers         →  04, 05, 06
Level 3  Documents         →  07, 08
Level 4  Design            →  09
Level 5  Marketing         →  10
Level 6  Workflow          →  11
Level 7  Plugins           →  12, 13
Level 8  Custom Engines    →  14
Level 9  Capstone          →  15
```

Work through them in order — each level assumes everything taught in
the levels above it, and 15 deliberately introduces nothing new.

| # | Example | Level | Difficulty | Time | Concept |
|---|---------|-------|------------|------|---------|
| 01 | [Getting Started](src/01-getting-started/README.md) | 1. Getting Started | Beginner | 5 min | `AIBuilder`, provider fallback, `ai.text()` |
| 02 | [Prompt Templates](src/02-prompt-templates/README.md) | 1. Getting Started | Beginner | 5 min | Versioned prompts via `PromptRegistry` |
| 03 | [Interactive Chat](src/03-interactive-chat/README.md) | 1. Getting Started | Beginner | 10 min | Client-managed conversation state |
| 04 | [Custom Provider](src/04-custom-provider/README.md) | 2. Providers | Beginner | 5 min | Implementing the `Provider` interface |
| 05 | [Provider Comparison](src/05-provider-comparison/README.md) | 2. Providers | Intermediate | 10 min | `Evaluator.compare()` across configs |
| 06 | [Observability](src/06-observability/README.md) | 2. Providers | Intermediate | 10 min | `ObservabilityBus`, auto vs. manual instrumentation |
| 07 | [Document Intelligence](src/07-document-intelligence/README.md) | 3. Documents | Intermediate | 10 min | `@aidex/document` feature package |
| 08 | [Resume Analyzer](src/08-resume-analyzer/README.md) | 3. Documents | Intermediate | 10 min | One engine (`resume.analyze`) in depth |
| 09 | [Brand Kit Generator](src/09-brand-kit-generator/README.md) | 4. Design | Intermediate | 10 min | `@aidex/design`, composing 4 engines |
| 10 | [Marketing Campaign](src/10-marketing-campaign/README.md) | 5. Marketing | Intermediate | 10 min | `@aidex/marketing`, composing 4 engines |
| 11 | [Workflow Orchestration](src/11-workflow-orchestration/README.md) | 6. Workflow | Advanced | 15 min | `Workflow`/`WorkflowExecutor`, real step dependencies, cancellation |
| 12 | [Plugin Example](src/12-plugin-example/README.md) | 7. Plugins | Advanced | 10 min | `ExtendedPlugin` + `PluginManager` |
| 13 | [Tool Registry](src/13-tool-registry/README.md) | 7. Plugins | Intermediate | 5 min | Permission-gated `Tool` execution |
| 14 | [Custom Engine](src/14-custom-engine/README.md) | 8. Custom Engines | Advanced | 10 min | Building your own `Engine`, façade path |
| 15 | [Real-World Assistant](src/15-real-world-assistant/README.md) | 9. Capstone | Advanced | 15 min | Every concept above, composed |

## Which example teaches X?

- **Provider abstraction:** 01, 04, 05
- **Engines (built-in feature packages):** 07, 08, 09, 10
- **Engines (your own):** 14
- **Workflows:** 11
- **Plugins:** 12
- **Tools/permissions:** 13
- **Prompt templates:** 02
- **Observability/cost/telemetry:** 05, 06
- **Conversation/chat patterns:** 03, 15

## Package cross-reference

| Package | Used by | Explore next |
|---|---|---|
| `@aidex/sdk` | all | — |
| `@aidex/providers` | 01, 03, 04, 05, 06, 07-15 | — |
| `@aidex/prompts` | 02, 15 | — |
| `@aidex/document` | 07, 08, 11, 15 | — |
| `@aidex/design` | 09 | — |
| `@aidex/marketing` | 10 | — |
| `@aidex/evaluation` | 05 | — |
| `@aidex/workflow` | 11 | — |
| `@aidex/plugins` | 12 | — |
| `@aidex/tools` | 12, 13 | — |
| `@aidex/observability` | 06, 15 | — |
| `@aidex/engines` | 14 | — |
| `@aidex/core` | 12, 14 | — |
| `@aidex/content` | none | Overlaps document/marketing scope for this course — worth exploring if you need general-purpose rewrite/tone/expand-style content generation |
| `@aidex/media` | none | No real image/audio/video processing exists yet (provider abstraction is text-only) — explore its engine shapes if you're prototyping against that future |
| `@aidex/cli` | none | A real "first application built on Aidex" — explore its README if you want to build your own CLI on top of the SDK |

## Design notes

- Every example is fully independent — no example imports from another
  example's folder. Small helpers (ANSI color, `readline` prompts, demo
  provider fallbacks) are duplicated per file on purpose, so each
  example stays copy-pasteable on its own.
- Every example that calls an LLM checks `GEMINI_API_KEY` and falls
  back to a deterministic demo provider when it's unset — printing a
  visible notice, never silently pretending to be live.
- Nothing here fakes a capability the SDK doesn't have: no real
  image/PDF/audio processing exists in Aidex today, and examples that
  touch `@aidex/design`/`@aidex/media`-adjacent output say so
  explicitly rather than implying otherwise.

## Running an example

```bash
pnpm install
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples <script-name>   # e.g. getting-started, interactive-chat, custom-engine
```
