# Examples Redesign — Design

Date: 2026-08-03
Status: Approved (roster + open decisions confirmed by user 2026-08-03)
Scope: `examples/` only (source, package.json, tsconfig references, per-example README, master README). No changes to `packages/*`, `apps/*`, runtime code, public APIs, or architecture docs.

## Problem

Current `examples/` (8 folders) are API demonstrations — one API surface per file (custom provider, custom engine, plugin, workflow, prompt registry, tool registry, observability). They prove the SDK works but don't teach anyone how to build something with it. Aidex is now OSS-published; examples are the first thing a new developer runs. They need to read as miniature real applications, interactive where sensible, organized as a learning path across the SDK's actual domain packages (document, design, marketing) which today have zero examples.

## Ground truths (verified against source, not assumed)

- **Providers**: only `GeminiProvider` and `StubProvider` exist (`@aidex/providers`). No OpenAI/Anthropic/other vendor. `StubProvider.generate()` returns `{ content: "stub:" + prompt.content }` — plain text, never JSON.
- **No chat/conversation API**: no message-history or conversation abstraction anywhere in the codebase. The only text-generation call is `AI.text(input: string): Promise<string>` (single-shot, one call = one exchange, no memory of prior turns).
- **SDK façade exists and is under-used**: `AIBuilder` has `.provider()/.plugin()/.engine()/.workflow()/.prompt()/.tool()/.use(featurePackage)/.build()`; `AI` has `.execute()/.text()/.engine(id)/.workflow(id)/.renderPrompt()/.prompts()/.catalog()/.tools()`. Current examples 03 (custom-engine) and 04 (plugin) bypass this and drive `EngineRegistry`/`PluginManager` directly — that was true necessity when the repo's README was written, it no longer is for the engine case.
- **Domain feature packages** (`@aidex/document`, `@aidex/design`, `@aidex/marketing`, `@aidex/content`, `@aidex/media`) each export a `*_FEATURE_PACKAGE` constant consumed via `AIBuilder.use()`, plus individual `Engine` instances reachable by ID through `ai.engine(id).execute(input)`. All of these engines JSON-parse the provider's response — they throw against `StubProvider` (non-JSON output). They only produce meaningful output against `GeminiProvider` or a hand-built JSON-emitting stub.
- **No real file processing**: no PDF/image/audio library anywhere in the monorepo. "Visual asset" outputs (logos, banners, mockups) and "media" engines (image/audio/video) are text specs wrapped in `data:text/plain,...` URIs — a documented limitation of the provider abstraction (text-only `generate()`), not something an example can paper over. Examples must say this plainly rather than imply real image/PDF generation.
- **`document.ocr` throws `NotImplementedError`** unconditionally — excluded from any example.
- **`@aidex/evaluation`** is a generic benchmark/comparison runner (`Evaluator.run/compare`), not resume/ATS-specific logic — good fit for the provider-comparison example, not a resume scorer.
- **No CLI color/prompt library** (chalk/inquirer/ora/prompts) is an actual dependency anywhere in the repo today (only transitive, via vitest/tsup). Per user decision: do not add one — hand-roll ANSI color codes and use Node's built-in `readline/promises` for interactive menus.
- **Examples convention**: each example is a fully independent, self-contained program (own `src/<NN-name>/index.ts`, own script in `examples/package.json`), importing only published `@aidex/*` package APIs, no cross-imports between examples. Per user decision, this independence is preserved even at the cost of duplicating small helpers (demo-provider stub, ANSI/readline helper) across files — no new shared internal module.

## Roster (14 examples, 8 levels)

| # | Folder | Level | Concept | Fate |
|---|--------|-------|---------|------|
|1|`01-getting-started`|1. Getting Started|`AIBuilder`, provider setup w/ Gemini→Stub fallback, `ai.text()`|rewrite of old `01-hello-world`|
|2|`02-prompt-templates`|1|Versioned `PromptTemplate` render/list|rename of old `06-prompt-registry`, minor polish|
|3|`03-interactive-chat`|1|Chat loop over stateless `ai.text()`: provider-select menu, system prompt, manual history accumulation, `exit`/`quit` command|new|
|4|`04-custom-provider`|2. Providers|Implement the `Provider` interface yourself|keep (old `02-custom-provider`), light polish|
|5|`05-provider-comparison`|2|One question → provider configs compared side by side; latency/tokens/cost via `Evaluator.compare()`. With `GEMINI_API_KEY`: two Gemini model configs + Stub baseline. Without: two demo-provider variants (different simulated latency) + Stub, so the comparison mechanics still run end to end; output notes that real numbers need a key|new|
|6|`06-observability`|2|`ObservabilityBus` wired to real `ai.engine()`/`ai.text()` calls — timings, tokens, cost, event stream|upgrade of old `08-observability` (was manual-only, no real call wired through)|
|7|`07-document-intelligence`|3. Documents|`@aidex/document`: extract/summarize/classify/keywords/review, interactive op-select menu, sample invoice/contract text fixtures|new|
|8|`08-resume-analyzer`|3|`resume.analyze` engine on a sample resume.md fixture|new|
|9|`09-brand-kit-generator`|4. Design|`@aidex/design`: brand voice, palette, typography, logo concept from a company description|new|
|10|`10-marketing-campaign`|5. Marketing|`@aidex/marketing`: email copy, social caption, SEO keywords, campaign plan assembled into one output|new|
|11|`11-workflow-orchestration`|6. Workflow|Real multi-engine pipeline (extract → summarize → translate → review) via `Workflow`/`WorkflowExecutor`, with event telemetry + cancellation demo|rewrite of old `05-workflow` (was toy fetch/transform/save steps)|
|12|`12-plugin-example`|7. Plugins|`ExtendedPlugin`: registration, execution, lifecycle hooks explained|keep (old `04-plugin`), sharpen explanation of why `PluginManager` needs raw `Aidex`, not the SDK façade — that's real architecture, not a gap|
|13|`13-tool-registry`|7|Permission-gated `Tool` execution — granted vs denied|keep (old `07-tool-registry`), reframed as Plugins-level bonus|
|14|`14-custom-engine`|8. Custom Engines|Build + register your own `Engine`, run it through `AIBuilder().engine(x).build()` + `ai.engine(id).execute()` — the modern façade path|rewrite of old `03-custom-engine` (was bypassing façade via raw `EngineRegistry`)|

Not built as a standalone example (deliberate YAGNI, cross-linked instead in master README "explore next"): `@aidex/content` (overlaps document/marketing for this course), `@aidex/media` (no real media processing exists — would mislead), `@aidex/cli` (belongs to a "build a CLI on Aidex" example that's out of this scope).

## Per-example structure (all 14)

```
examples/src/<NN-name>/
  index.ts        # the program
  fixtures/        # only for 07, 08, 09, 10, 11 — sample .md/.txt input files
  README.md        # Purpose / Requirements / Install / Run / Expected output / Concepts learned / Related packages / Next example
```

Every example:
- Detects `GEMINI_API_KEY` at startup. If present: real `GeminiProvider`. If absent: prints a one-line notice ("No GEMINI_API_KEY found — running in demo mode with canned responses. Set GEMINI_API_KEY for real output.") and uses a small inline deterministic JSON-emitting demo provider (for examples 05, 06, 07, 08, 09, 10, 11 whose engines require valid JSON) or `StubProvider` directly (for 01, 02, 03, 04, 12, 13, 14 whose calls are plain-text `ai.text()` or don't require JSON parsing).
- Prints clean, readable console output — headers, clear section breaks, no raw JSON dumps without labels.
- Comments explain WHY (e.g. why a demo provider exists, why `PluginManager` takes a raw `Aidex`, why cancellation matters in workflows) — not WHAT the code obviously does.
- Interactive pieces (provider select, op select, "run again?", exit) use `readline/promises` + a tiny hand-rolled `color()` helper (ANSI codes), duplicated per file per the independence convention.

## Master README (`examples/README.md`)

Becomes a portal:
- One-paragraph pitch + prerequisites (Node ≥18, pnpm, optional `GEMINI_API_KEY`).
- Level table: level name, folder, difficulty (Beginner/Intermediate/Advanced), est. time (5–15 min), one-line concept, link.
- Learning-path diagram (1 → 8, textual/ASCII, matching the level list in the task brief).
- "Which example teaches X" quick index (provider abstraction, engines, workflows, plugins, tools, observability, prompt templates).
- Package cross-reference table (which `@aidex/*` package each example touches, plus a short "explore next" row for `@aidex/content`, `@aidex/media`, `@aidex/cli`).
- Running instructions (build once via `tsc -b`, then per-example `pnpm --filter @aidex/examples <script>`).

## Build/config changes

- `examples/package.json`: rename/add scripts for all 14 (`getting-started`, `prompt-templates`, `interactive-chat`, `custom-provider`, `provider-comparison`, `observability`, `document-intelligence`, `resume-analyzer`, `brand-kit-generator`, `marketing-campaign`, `workflow-orchestration`, `plugin-example`, `tool-registry`, `custom-engine`).
- `examples/tsconfig.json`: add project references for `@aidex/document`, `@aidex/design`, `@aidex/marketing`, `@aidex/evaluation` (new deps for examples 05, 07, 08, 09, 10).
- Delete/replace old folders `01-hello-world` through `08-observability` per the mapping table above (git will show renames where content carries over).

## Validation plan

- `pnpm --filter @aidex/examples build` (`tsc -b`) — must succeed for all 14.
- `pnpm --filter @aidex/examples typecheck` — must succeed.
- Run every example once with no `GEMINI_API_KEY` set (demo-mode path) — must complete without throwing, output must look clean.
- Confirm no example imports anything outside published `@aidex/*` package barrels (no deep `dist/` or `src/` reaches into another package).
- Known gap: no live `GEMINI_API_KEY` available in this environment, so the real-Gemini code path is reviewed for correctness but not executed live. Will be called out explicitly in the final report rather than claimed as verified.

## Out of scope (explicit)

- No changes to any `packages/*` source, public API, or architecture docs.
- No new runtime dependencies added anywhere (including `examples/package.json`) beyond the new intra-monorepo `@aidex/*` package references listed above.
- No PDF/OCR/image processing implemented — examples state this limitation honestly rather than fake it.
