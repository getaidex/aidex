# Examples Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 8 API-demonstration examples in `examples/` with a 15-example, 9-level learning path (plus one tutorial doc) that teaches real developer problems using Aidex's actual published APIs — provider abstraction, engines, workflows, plugins, tools, prompt templates, observability, and the document/design/marketing feature packages.

**Architecture:** Each example is a fully independent, self-contained TypeScript program under `examples/src/<NN-name>/index.ts`, built via the existing `tsc -b` project-reference setup and run as plain Node (`node dist/<NN-name>/index.js`). No shared internal helper modules between examples — small helpers (ANSI color, readline prompt, demo-provider fallback) are intentionally duplicated per file. Every example detects `GEMINI_API_KEY` and falls back to a demo provider so it runs with zero setup.

**Tech Stack:** TypeScript, Node ≥18 built-in `readline/promises`, `@aidex/sdk` (`AIBuilder`/`AI`), `@aidex/providers` (`GeminiProvider`/`StubProvider`), `@aidex/document`, `@aidex/design`, `@aidex/marketing`, `@aidex/evaluation`, `@aidex/workflow`, `@aidex/plugins`, `@aidex/tools`, `@aidex/prompts`, `@aidex/observability`, `@aidex/core`, `@aidex/engines`. No new npm dependencies.

## Global Constraints

- Do not modify anything under `packages/*` or `apps/*`. Do not modify runtime code, public APIs, or architecture docs. Only `examples/` (and this plan/spec doc) changes.
- No new npm dependencies anywhere, including `examples/package.json`. Interactivity uses only Node's built-in `readline/promises`; color uses hand-rolled ANSI escape codes.
- Every example is self-contained: no imports from another example's folder. Small helpers (color, `ask()`, demo-provider fallback) are duplicated per file on purpose.
- Every example that needs an LLM detects `process.env.GEMINI_API_KEY`. If present: real `GeminiProvider`. If absent: prints a visible one-line demo-mode notice and uses a fallback provider (`StubProvider` for plain-text calls, an inline deterministic JSON-emitting demo provider for JSON-parsing engine calls) — never silently pretend to be live.
- All `@aidex/document` engines require `source.mimeType` to start with `text/` — fixtures are plain `.md`/`.txt` files, never binary. Never call `document.ocr` (it throws `NotImplementedError` unconditionally).
- Never claim real image/PDF/audio processing. Design/media "asset" outputs are `data:text/plain,...` text specs — say so explicitly wherever such an engine's output is shown.
- Build via `tsc -b` at the `examples/` package root; run via plain `node`, never `ts-node`/`tsx`.
- Every example README follows the template in Task 1 and answers, up front: what problem does this solve, why this Aidex feature, when to use it in a real project, what to learn next.
- Real, verified type signatures to use (do not invent alternatives):
  - `AIBuilder`: `.provider(p: Provider): this`, `.plugin(p: Plugin): this`, `.engine(e: Engine): this`, `.workflow(w: Workflow): this`, `.prompt(p: PromptTemplate): this`, `.tool(t: Tool): this`, `.use(pkg: FeaturePackage): this`, `.build(): AI`.
  - `AI`: `.text(input: string): Promise<string>`, `.engine<TResult, TContext>(id: string): EngineHandle<TResult, TContext>` (`.execute(input?: unknown): Promise<TResult>`), `.workflow<TState>(id): WorkflowHandle<TState>`, `.renderPrompt(id, vars?, version?): string`, `.prompts(): PromptRegistry`, `.catalog(): EngineCatalog`, `.tools(): ToolRegistry`.
  - `Provider`: `{ readonly name: string; generate(prompt: {content: string; metadata?}, options?): Promise<{content: string; raw?; metadata?}> }`.
  - `GeminiProvider`: `new GeminiProvider({ apiKey?, model?, pricing?: {inputPricePerMillion, outputPricePerMillion}, observability?: ObservabilityBus })`.
  - `StubProvider`: `new StubProvider({ name? })` — `generate()` returns `{ content: "stub:" + prompt.content }`, plain text only, never valid JSON.
  - `Engine<TResult>`: `{ readonly id, name, description, version; execute(context: ExecutionContext): Promise<TResult> }`. `ExecutionContext` only requires `{ config: { provider }, provider }` to construct by hand.
  - `PromptTemplate`: `{ readonly id, version, template, variables?: readonly string[] }`. `PromptRegistry`: `.register(t)`, `.render(id, vars?, version?): string`, `.listVersions(id): PromptTemplate[]`.
  - `Tool`: `{ readonly id, name, description, permissions?: readonly string[]; execute(input): Promise<TResult> }`. `ToolRegistry.execute(id, input, grantedPermissions: string[] = [])` — throws `ToolPermissionDeniedError` on mismatch.
  - `ObservabilityBus`: `.subscribe(fn)`, `.trackProvider/.trackTokens/.trackDuration/.trackCost(metadata)`, `.trackDurationFromMetrics(metrics: ExecutionMetrics, extra?)`, `.trackCostFromEstimate(input: CostEstimateInput, extra?)`, `.getTimeline(): ObservabilityEvent[]`. `ExecutionMetrics.recordStart(ts = Date.now())` / `.recordEnd(ts = Date.now())` take plain numbers. `GeminiProvider` auto-emits `provider`/`duration`/`tokens`/`cost` events when constructed with `{ observability, pricing }` — `StubProvider` emits nothing automatically. **`ObservabilityEvent` shape is `{ event: string; metadata?: Record<string, unknown> }`** — the event-name field is literally called `event`, not `type` (that's `WorkflowEvent`'s field name, a different type from `@aidex/workflow` — don't confuse the two), and anything `trackDurationFromMetrics`/`trackCostFromEstimate`/etc. attach (like `durationMs`) lives inside `event.metadata`, never top-level on the event.
  - `Evaluator` (`@aidex/evaluation`): `.compare(cases: BenchmarkCase[], options?: {pricing?, runs?}): Promise<BenchmarkSummary[]>`. `BenchmarkCase = { name, execute(): Promise<T>, scoreOutput?(r), estimateTokens?(r): {inputTokens, outputTokens} }`. `BenchmarkSummary = { caseName, runs, successRate, averageDurationMs?, averageQualityScore?, averageCost? }`.
  - `Workflow<TState>`: `.addStep({ name, execute(context: TState): Promise<void> })`. `WorkflowExecutor.execute(workflow, context, { onEvent?, signal? }): Promise<TState>`. `WorkflowEvent.type` ∈ `'workflow-started'|'workflow-completed'|'workflow-cancelled'|'step-started'|'step-completed'|'step-failed'`. Cancellation throws `WorkflowCancelledError`.
  - `ExtendedPlugin`: `{ name; registerEngines?(): Engine[]; registerPrompts?(): PromptTemplate[]; registerTools?(): Tool[] }`. `PluginManager`: `constructor(aidex: Aidex)`, `.use(plugin)`, `.getEngineRegistry()/.getPromptRegistry()/.getToolRegistry()`. Requires a raw `new Aidex({ provider })` kernel instance — the SDK façade (`AIBuilder`/`AI`) never constructs a `PluginManager`; this is intentional two-tier architecture (kernel plugin system vs. SDK façade), not a gap to apologize for.
  - `@aidex/document`: `DocumentEngineId` = `{ Extract:'document.extract', Translate:'document.translate', Summarize:'document.summarize', Classify:'document.classify', Keywords:'document.keywords', Review:'document.review', ResumeAnalyze:'resume.analyze', InvoiceExtract:'invoice.extract', ContractReview:'contract.review', Ocr:'document.ocr' (never use), Transform:'document.transform' }`. `DOCUMENT_FEATURE_PACKAGE` used via `AIBuilder.use()`.
    - `document.extract`: in `{source, fields?: string[]}` → out `{fields: Record<string,string>, confidence?: Record<string,number>}`.
    - `document.summarize`: in `{source, maxLength?}` → out `{summary: string}` — **plain text, not JSON-parsed**.
    - `document.classify`: in `{source}` → out `{documentType: string, confidence?: number}`.
    - `document.keywords`: in `{source}` → out `{keywords: readonly string[]}`.
    - `document.review`: in `{source, focusAreas?}` → out `{findings: {issue, severity:'low'|'medium'|'high', recommendation}[], summary?}`.
    - `document.translate`: in `{source, targetLanguage: string, sourceLanguage?}` → out `{translatedText: string, detectedSourceLanguage?}`.
    - `resume.analyze`: in `{source, jobDescription?: string}` → out `{candidateName?, skills: readonly string[], experienceYears?: number, summary?: string, matchScore?: number}` (0-100, only populated when `jobDescription` given). **No `strengths`/`weaknesses`/`atsScore` field exists.**
    - `invoice.extract`: in `{source}` → out `{invoiceNumber?, issueDate?, dueDate?, vendorName?, totalAmount?: number, currency?, lineItems: {description, quantity?, unitPrice?, amount?}[]}`.
    - `contract.review`: in `{source, focusAreas?}` → out `{risks: {clause, severity:'low'|'medium'|'high', explanation}[], summary?}`.
  - `@aidex/design`: `DesignEngineId.Brand='design.brand'`, `.Palette='design.palette'`, `.Typography='design.typography'`, `.Logo='design.logo'`. `DESIGN_FEATURE_PACKAGE`. All take `{brief: string, targetAudience?, style?, industry?}`.
    - `design.brand` → `{logo: {assetUrl, format, width?, height?}, palette: string[], typography: string[], guidelines?: string}`.
    - `design.palette` → `{colors: {name, hex, role?}[]}`.
    - `design.typography` → `{pairings: {heading, body, notes?}[]}`.
    - `design.logo` → `{primary: {assetUrl,...}, variants?: {assetUrl,...}[]}`.
  - `@aidex/marketing`: `MarketingEngineId.EmailCopy='marketing.email.copy'`, `.SocialCaption='marketing.social.caption'`, `.SeoKeywords='marketing.seo.keywords'`, `.CampaignPlan='marketing.campaign.plan'`. `MARKETING_FEATURE_PACKAGE`.
    - `marketing.email.copy`: in `{brief, targetAudience?, callToAction?}` → out `{subject: string, body: string}`.
    - `marketing.social.caption`: in `{brief, targetAudience?, platform?}` → out `{caption: string}`.
    - `marketing.seo.keywords`: in `{brief, targetAudience?, market?}` → out `{keywords: {keyword, estimatedVolume?, difficulty?:'low'|'medium'|'high'}[]}`.
    - `marketing.campaign.plan`: in `{brief, targetAudience?, channels?: string[], budget?, durationDays?}` → out `{objectives: {goal, metric?}[], channels: string[] (echoed from input, not model-generated), summary: string}`.

---

## Task 1: Scaffolding — clear old examples, wire new build config

> **Amendment (discovered while implementing Task 9):** `tsc` never copies non-`.ts` files — the `.md` fixtures under `examples/src/07-document-intelligence/fixtures/`, `08-resume-analyzer/fixtures/`, and `11-workflow-orchestration/fixtures/` do NOT end up in `dist/` from `tsc -b` alone, so those examples' `readFile(path.join(__dirname, 'fixtures', ...))` calls would throw `ENOENT` on a real clean build. Step 3 below now also creates `examples/scripts/copy-fixtures.js` and wires it into the `build` script. Whichever task's implementer reaches this first should add it if a prior task hasn't already.

**Files:**
- Modify: `examples/tsconfig.json`
- Modify: `examples/package.json`
- Create: `examples/scripts/copy-fixtures.js`
- Delete: `examples/src/01-hello-world/`, `examples/src/02-custom-provider/`, `examples/src/03-custom-engine/`, `examples/src/04-plugin/`, `examples/src/05-workflow/`, `examples/src/06-prompt-registry/`, `examples/src/07-tool-registry/`, `examples/src/08-observability/`

**Interfaces:**
- Produces: the `pnpm --filter @aidex/examples <script>` entrypoints every later task's example is registered under, and the TS project references every later task's example needs to typecheck against `@aidex/document`, `@aidex/design`, `@aidex/marketing`, `@aidex/evaluation`.

- [ ] **Step 1: Remove the old example folders**

```bash
git rm -r examples/src/01-hello-world examples/src/02-custom-provider examples/src/03-custom-engine examples/src/04-plugin examples/src/05-workflow examples/src/06-prompt-registry examples/src/07-tool-registry examples/src/08-observability
```

- [ ] **Step 2: Rewrite `examples/tsconfig.json` project references**

Read the current file first, then replace its `references` array so it includes every package any new example imports (existing 9 plus the 4 new ones):

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "references": [
    { "path": "../packages/core" },
    { "path": "../packages/engines" },
    { "path": "../packages/observability" },
    { "path": "../packages/plugins" },
    { "path": "../packages/prompts" },
    { "path": "../packages/providers" },
    { "path": "../packages/sdk" },
    { "path": "../packages/tools" },
    { "path": "../packages/workflow" },
    { "path": "../packages/document" },
    { "path": "../packages/design" },
    { "path": "../packages/marketing" },
    { "path": "../packages/evaluation" }
  ],
  "include": ["src"]
}
```

(Keep whatever `compilerOptions` the existing file already has beyond `rootDir`/`outDir` — only the `references` array is being replaced.)

- [ ] **Step 3: Rewrite `examples/package.json` scripts and dependencies**

Read the current file first to preserve `name`/`version`/`private`/`type` fields, then replace `scripts` and `dependencies`:

```json
{
  "scripts": {
    "build": "tsc -b && node scripts/copy-fixtures.js",
    "typecheck": "tsc -b --noEmit",
    "getting-started": "node dist/01-getting-started/index.js",
    "prompt-templates": "node dist/02-prompt-templates/index.js",
    "interactive-chat": "node dist/03-interactive-chat/index.js",
    "custom-provider": "node dist/04-custom-provider/index.js",
    "provider-comparison": "node dist/05-provider-comparison/index.js",
    "observability": "node dist/06-observability/index.js",
    "document-intelligence": "node dist/07-document-intelligence/index.js",
    "resume-analyzer": "node dist/08-resume-analyzer/index.js",
    "brand-kit-generator": "node dist/09-brand-kit-generator/index.js",
    "marketing-campaign": "node dist/10-marketing-campaign/index.js",
    "workflow-orchestration": "node dist/11-workflow-orchestration/index.js",
    "plugin-example": "node dist/12-plugin-example/index.js",
    "tool-registry": "node dist/13-tool-registry/index.js",
    "custom-engine": "node dist/14-custom-engine/index.js",
    "real-world-assistant": "node dist/15-real-world-assistant/index.js"
  },
  "dependencies": {
    "@aidex/core": "workspace:*",
    "@aidex/engines": "workspace:*",
    "@aidex/observability": "workspace:*",
    "@aidex/plugins": "workspace:*",
    "@aidex/prompts": "workspace:*",
    "@aidex/providers": "workspace:*",
    "@aidex/sdk": "workspace:*",
    "@aidex/tools": "workspace:*",
    "@aidex/workflow": "workspace:*",
    "@aidex/document": "workspace:*",
    "@aidex/design": "workspace:*",
    "@aidex/marketing": "workspace:*",
    "@aidex/evaluation": "workspace:*"
  }
}
```

Check the existing `dependencies` block's version-range style (likely `"workspace:*"` already, matching every other package in the monorepo) before finalizing — match it exactly rather than assuming.

- [ ] **Step 4: Create `examples/scripts/copy-fixtures.js`**

`tsc` only emits `.ts`/`.d.ts` output — it silently ignores non-TS files like the `.md` fixtures under each example's `fixtures/` folder, so they never reach `dist/`. This script copies every example's `fixtures/` folder (if it has one) from `src/` to `dist/` after each build:

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '..', 'src');
const distDir = path.join(__dirname, '..', 'dist');

function copyFixtures() {
  const examples = fs.readdirSync(srcDir).filter(
    (name) => fs.statSync(path.join(srcDir, name)).isDirectory()
  );

  for (const example of examples) {
    const srcFixtures = path.join(srcDir, example, 'fixtures');
    if (fs.existsSync(srcFixtures)) {
      const distFixtures = path.join(distDir, example, 'fixtures');
      fs.cpSync(srcFixtures, distFixtures, { recursive: true, force: true });
    }
  }
}

copyFixtures();
```

- [ ] **Step 5: Verify the scaffold is coherent**

Run: `pnpm install` (picks up new workspace deps) then `pnpm --filter @aidex/examples build`
Expected: fails only because `src/` has no files yet matching `rootDir`/`include` unless at least a placeholder exists — that's fine, later tasks add real files. If `tsc -b` errors about an empty `src` dir, that's expected at this point; do not treat it as a scaffolding bug. Confirm instead that `pnpm install` succeeds and lists the 4 new workspace deps resolved.

- [ ] **Step 6: Commit**

```bash
git add examples/tsconfig.json examples/package.json examples/scripts/copy-fixtures.js
git commit -m "chore(examples): clear old examples, wire config for redesign"
```

---

## Task 2: `01-getting-started`

**Files:**
- Create: `examples/src/01-getting-started/index.ts`
- Create: `examples/src/01-getting-started/README.md`

**Interfaces:**
- Consumes: `AIBuilder`, `AI` from `@aidex/sdk`; `GeminiProvider`, `StubProvider` from `@aidex/providers`.
- Produces: nothing consumed by later tasks (each example is independent) — this task establishes the provider-fallback pattern in prose (the README), which later tasks restate in their own words, not by importing code from here.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 01 — Getting Started
 *
 * The smallest possible Aidex program: build an AI instance with a
 * provider, send one prompt, print the response.
 *
 * Why start here: every other example in this course builds on the same
 * two lines — `new AIBuilder().provider(p).build()` and `ai.text(input)`.
 * Understand this first and the rest of the course is composition, not
 * new concepts.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    console.log('Using GeminiProvider — GEMINI_API_KEY detected.\n');
    return new GeminiProvider({ apiKey });
  }
  // StubProvider is not a mock for tests — it's a real, deterministic
  // Provider implementation, exactly the shape a production provider
  // would satisfy. Falling back to it (instead of throwing) means this
  // example runs for anyone who clones the repo, no API key required.
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).');
  console.log('Set GEMINI_API_KEY to see a real model response.\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();

  const prompt = 'Suggest three good weekend project ideas for a TypeScript developer.';
  console.log(`Prompt: ${prompt}\n`);

  const response = await ai.text(prompt);
  console.log('Response:');
  console.log(response);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 01 — Getting Started

**Level 1 · Getting Started · Beginner · ~5 min**

## What problem does this solve?
Every Aidex program starts the same way: pick a provider, build an `AI`
instance, send a prompt. This example is that skeleton, stripped to the
minimum, so you can see the whole shape before any example adds complexity.

## Why would I use this Aidex feature?
`AIBuilder` is the one on-ramp into the SDK. It decouples "which model
answers this" (the `Provider`) from "what am I asking" (your prompt) —
so swapping providers later never touches your prompt code.

## When should I use this in a real project?
At the very start of any Aidex integration — this is the smallest
possible thing that proves your provider credentials and wiring work
before you build anything on top.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` environment variable (falls back to a demo
  provider if unset — see "Expected output" below)

## Install
From the repo root: `pnpm install`

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples getting-started
# or, with no key, to see demo mode:
pnpm --filter @aidex/examples getting-started
```

## Expected output
With a real key, three genuine project ideas from Gemini. Without one:
```
No GEMINI_API_KEY found — using StubProvider (demo mode).
Set GEMINI_API_KEY to see a real model response.

Prompt: Suggest three good weekend project ideas for a TypeScript developer.

Response:
stub:Suggest three good weekend project ideas for a TypeScript developer.
```
That `stub:` prefix is not a bug — `StubProvider` deterministically echoes
its input so this example (and its tests) never depend on the network.

## Concepts learned
- `AIBuilder().provider(p).build()` — the universal entry point
- `ai.text(input)` — the single-shot text call every provider supports
- Provider fallback pattern: detect a real key, else run a deterministic stand-in

## Related packages
`@aidex/sdk`, `@aidex/providers`

## Next example
[02 — Prompt Templates](../02-prompt-templates/README.md) — before you
hand-write more prompts like the one above, learn how to template and
version them.
```

- [ ] **Step 3: Build and run in demo mode**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples getting-started`
Expected: exits 0, prints the demo-mode notice and the `stub:...` response.

- [ ] **Step 4: Commit**

```bash
git add examples/src/01-getting-started
git commit -m "feat(examples): add 01-getting-started"
```

---

## Task 3: `02-prompt-templates`

**Files:**
- Create: `examples/src/02-prompt-templates/index.ts`
- Create: `examples/src/02-prompt-templates/README.md`

**Interfaces:**
- Consumes: `PromptTemplate`, `PromptRegistry` from `@aidex/prompts`; `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 02 — Prompt Templates
 *
 * Real prompts change over time — you tighten wording, add a
 * constraint, fix a tone problem a user reported. If you hardcode
 * prompt strings inline, "what did v1 say" is lost the moment you edit
 * it. PromptRegistry keeps every version addressable by id + semver, so
 * you can render the latest, pin an old one, or list what changed.
 */
import { PromptRegistry } from '@aidex/prompts';
import type { PromptTemplate } from '@aidex/prompts';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

const supportReplyV1: PromptTemplate = {
  id: 'support-reply',
  version: '1.0.0',
  template:
    'Dear {{customerName}}, thank you for reporting: "{{issue}}". ' +
    'We are investigating and will respond within 24 hours.',
  variables: ['customerName', 'issue'],
};

// v2 tightened the tone after real customer feedback that v1 read as
// too formal/corporate — this is exactly the kind of change PromptRegistry
// is built to track without losing v1.
const supportReplyV2: PromptTemplate = {
  id: 'support-reply',
  version: '2.0.0',
  template:
    "Hi {{customerName}}, thanks for flagging this — \"{{issue}}\". " +
    "We're on it and will get back to you within a day.",
  variables: ['customerName', 'issue'],
};

async function main() {
  const registry = new PromptRegistry();
  registry.register(supportReplyV1);
  registry.register(supportReplyV2);

  const variables = { customerName: 'Priya', issue: 'checkout button does nothing on Safari' };

  console.log('Latest version (render() defaults to most-recently-registered):');
  console.log(registry.render('support-reply', variables));

  console.log('\nExplicitly pinned to v1.0.0:');
  console.log(registry.render('support-reply', variables, '1.0.0'));

  console.log('\nAll registered versions of "support-reply":');
  for (const template of registry.listVersions('support-reply')) {
    console.log(`  - ${template.version}`);
  }

  console.log('\nSending the latest rendered prompt to a real provider call:');
  const ai = new AIBuilder().provider(createProvider()).build();
  const response = await ai.text(registry.render('support-reply', variables));
  console.log(response);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 02 — Prompt Templates

**Level 1 · Getting Started · Beginner · ~5 min**

## What problem does this solve?
Prompts drift as you tune tone and instructions. Hardcoded prompt
strings scattered through a codebase make "what did the old wording
say" unanswerable once you've overwritten it.

## Why would I use this Aidex feature?
`PromptRegistry` stores every version of a prompt under one `id`,
addressable by exact semver. You can render the latest by default, pin
an older version for a customer stuck on it, or diff versions side by
side — all without string surgery in application code.

## When should I use this in a real project?
Any time a prompt is reused across call sites, or tuned iteratively
based on real output quality — support replies, system instructions,
report templates. Not needed for a genuinely one-off prompt.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples prompt-templates
```

## Expected output
Renders of both prompt versions with variables filled in, the version
list (`1.0.0`, `2.0.0`), then a real (or demo) call using the latest
rendered prompt.

## Concepts learned
- `PromptTemplate` shape: `{id, version, template, variables}`
- `PromptRegistry.render(id, vars, version?)` — defaults to latest
- `PromptRegistry.listVersions(id)` for auditing prompt history

## Related packages
`@aidex/prompts`, `@aidex/sdk`

## Next example
[03 — Interactive Chat](../03-interactive-chat/README.md) — use a
rendered prompt as a system prompt inside a real conversation loop.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples prompt-templates`
Expected: exits 0, shows both renders, version list, and a final response line.

- [ ] **Step 4: Commit**

```bash
git add examples/src/02-prompt-templates
git commit -m "feat(examples): add 02-prompt-templates"
```

---

## Task 4: `03-interactive-chat`

**Files:**
- Create: `examples/src/03-interactive-chat/index.ts`
- Create: `examples/src/03-interactive-chat/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `createInterface` from `node:readline/promises`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 03 — Interactive Chat
 *
 * Aidex's text call, `ai.text(input)`, is single-shot: it has no memory
 * of previous turns. There is no chat/conversation API in this SDK —
 * that is a deliberate, current fact about the API surface, not an
 * oversight this example papers over. This is the pattern for building
 * a conversational loop yourself: keep the transcript in your own
 * array, and re-send the whole thing (system prompt + history + new
 * message) as the prompt on every turn.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';

const color = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
};

// A single shared readline interface, not one created per prompt:
// rl.question() only reliably resolves once per process when stdin is
// piped (e.g. automated smoke tests) — every prompt after the first
// silently hangs forever. Reading through the interface's line
// iterator instead works correctly both interactively and piped.
// Returns null when stdin has no more input (EOF) rather than looping.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

async function chooseProvider(): Promise<Provider> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(color.yellow('No GEMINI_API_KEY found — running with StubProvider (demo mode).\n'));
    return new StubProvider();
  }
  const choice = await ask('Choose a provider — [1] Gemini  [2] Stub (demo): ');
  if (choice === '2') return new StubProvider();
  return new GeminiProvider({ apiKey });
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

function buildPrompt(systemPrompt: string, history: Turn[]): string {
  const lines: string[] = [];
  if (systemPrompt) lines.push(`System: ${systemPrompt}`);
  for (const turn of history) {
    lines.push(`${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`);
  }
  lines.push('Assistant:');
  return lines.join('\n');
}

async function main() {
  const provider = await chooseProvider();
  const ai = new AIBuilder().provider(provider).build();

  const systemPrompt = (await ask('Optional system prompt (press Enter to skip): ')) ?? '';
  console.log(color.dim("\nType 'exit' or 'quit' to end the conversation.\n"));

  const history: Turn[] = [];

  while (true) {
    const userInput = await ask(color.cyan('You: '));
    if (userInput === null || userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }
    if (!userInput) continue;

    history.push({ role: 'user', content: userInput });

    // Re-send the full transcript every turn — this IS the "memory."
    // There's no server-side session; the state lives entirely here.
    const prompt = buildPrompt(systemPrompt, history);
    const reply = await ai.text(prompt);

    history.push({ role: 'assistant', content: reply });
    console.log(`${color.dim('Assistant:')} ${reply}\n`);
  }
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 03 — Interactive Chat

**Level 1 · Getting Started · Beginner · ~10 min**

## What problem does this solve?
You want a multi-turn conversation — the model should "remember" what
was said earlier in the session.

## Why would I use this Aidex feature?
This example is deliberately teaching a gap: Aidex's `ai.text(input)`
is stateless, single-shot — there is no built-in conversation/message-
history API today. Rather than hide that, this shows the standard
pattern for building one yourself: keep a transcript array client-side,
re-render it into one prompt string every turn, and re-send the whole
thing. Understanding this now means you won't go looking for a
`ai.chat()` method that doesn't exist.

## When should I use this in a real project?
Any CLI tool, bot, or support agent that needs multi-turn context.
Watch prompt length as history grows — real projects usually cap or
summarize old turns before they blow past a model's context window
(not shown here, to keep the pattern legible).

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode,
  and skips the provider-choice prompt entirely in that case)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples interactive-chat
```
Type `exit` or `quit` to end the session.

## Expected output
An interactive prompt loop:
```
Choose a provider — [1] Gemini  [2] Stub (demo):
Optional system prompt (press Enter to skip):
Type 'exit' or 'quit' to end the conversation.

You: what's a good name for a cat?
Assistant: ...
You: exit
Goodbye!
```

## Concepts learned
- Why `ai.text()` is single-shot and what that implies
- Client-managed conversation state over a stateless API
- Interactive CLI loop with `readline/promises`, provider selection, exit command

## Related packages
`@aidex/sdk`, `@aidex/providers`

## Next example
[04 — Custom Provider](../04-custom-provider/README.md) — implement the
`Provider` interface yourself instead of using Gemini/Stub.
```

- [ ] **Step 3: Build; smoke-test non-interactively**

Run: `pnpm --filter @aidex/examples build`
Then verify the demo-mode path runs without hanging by piping input:
`printf "hi\nexit\n" | node examples/dist/03-interactive-chat/index.js`
Expected: exits 0, no `GEMINI_API_KEY` set so it skips straight to the system-prompt question (no provider-choice prompt), then processes "hi" as a turn and exits cleanly on "exit".

- [ ] **Step 4: Commit**

```bash
git add examples/src/03-interactive-chat
git commit -m "feat(examples): add 03-interactive-chat"
```

---

## Task 5: `04-custom-provider`

**Files:**
- Create: `examples/src/04-custom-provider/index.ts`
- Create: `examples/src/04-custom-provider/README.md`

**Interfaces:**
- Consumes: `Provider` type from `@aidex/core` (or `@aidex/providers` re-export); `AIBuilder` from `@aidex/sdk`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 04 — Custom Provider
 *
 * `Provider` is a two-member interface: a name and a `generate()`
 * function. Aidex ships GeminiProvider and StubProvider, but nothing
 * about the SDK requires either — you might wrap an internal model
 * server, a different vendor's API, or (as here, so this runs offline
 * and deterministically) a trivial local transform. This is the whole
 * contract you need to satisfy to plug anything in.
 */
import { AIBuilder } from '@aidex/sdk';
import type { Provider } from '@aidex/core';

function caesarShift(text: string, shift: number): string {
  return text.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + shift) % 26) + base);
  });
}

// A stand-in for "wraps a real backend" — deterministic and offline so
// the example needs no network and no API key, while proving out the
// exact same interface a production Provider would implement.
const caesarCipherProvider: Provider = {
  name: 'caesar-cipher-demo',
  async generate(prompt) {
    return { content: caesarShift(prompt.content, 3) };
  },
};

async function main() {
  const ai = new AIBuilder().provider(caesarCipherProvider).build();

  const prompt = 'Aidex makes it easy to swap providers';
  console.log(`Prompt: ${prompt}`);

  const response = await ai.text(prompt);
  console.log(`Response (Caesar-shifted by 3): ${response}`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 04 — Custom Provider

**Level 2 · Providers · Beginner · ~5 min**

## What problem does this solve?
You need Aidex to talk to something that isn't Gemini — an internal
model server, a different vendor, or (for testing) a fully
deterministic stand-in.

## Why would I use this Aidex feature?
`Provider` is intentionally the smallest possible contract: `name` plus
one async `generate(prompt)` method. Anything satisfying that shape
plugs into every SDK feature — engines, workflows, plugins — exactly
like `GeminiProvider` does. There's no special-casing of the built-in
providers anywhere in the SDK.

## When should I use this in a real project?
Wrapping a self-hosted model endpoint, adding a vendor Aidex doesn't
ship, or building a deterministic test double for your own test suite
(the same technique this example uses to run offline).

## Requirements
- Node ≥18, pnpm — no API key needed, this example never calls a network.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples custom-provider
```

## Expected output
```
Prompt: Aidex makes it easy to swap providers
Response (Caesar-shifted by 3): Dlgha pdnhv lw hdvb wr vzds surylghuv
```

## Concepts learned
- The full `Provider` interface (two members, nothing more)
- Providers don't have to call an LLM — any deterministic or remote
  transform that returns `{content: string}` qualifies

## Related packages
`@aidex/core`, `@aidex/sdk`

## Next example
[05 — Provider Comparison](../05-provider-comparison/README.md) — run
one question against several provider configs side by side.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples custom-provider`
Expected: exits 0, prints the shifted response exactly as above.

- [ ] **Step 4: Commit**

```bash
git add examples/src/04-custom-provider
git commit -m "feat(examples): add 04-custom-provider"
```

---

## Task 6: `05-provider-comparison`

**Files:**
- Create: `examples/src/05-provider-comparison/index.ts`
- Create: `examples/src/05-provider-comparison/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `Evaluator`, `BenchmarkCase`, `BenchmarkSummary` from `@aidex/evaluation`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 05 — Provider Comparison
 *
 * Aidex ships exactly two providers today: GeminiProvider and
 * StubProvider — no OpenAI/Anthropic/other vendor. So this isn't a
 * "which vendor is best" shootout; it's the *mechanics* of comparing
 * providers side by side using @aidex/evaluation's Evaluator, which
 * you'd reuse the moment a second real vendor Provider exists (see
 * 04-custom-provider for how to write one).
 *
 * With GEMINI_API_KEY: compares two Gemini model configs plus a Stub
 * baseline. Without one: compares two demo-provider variants (with
 * different simulated latency) plus Stub, so the comparison mechanics
 * still run end to end — the printed note makes clear that real
 * numbers require a key.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { Evaluator, type BenchmarkCase } from '@aidex/evaluation';

const question = 'In one sentence, what makes TypeScript different from JavaScript?';

// Illustrative pricing only — check your provider's current pricing page
// for real per-token rates before using this shape for real cost tracking.
const illustrativePricing = { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 };

function delayedDemoProvider(name: string, delayMs: number): Provider {
  return {
    name,
    async generate(prompt) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return { content: `[${name} demo answer] TypeScript adds static types on top of JavaScript.` };
    },
  };
}

function buildCases(): BenchmarkCase<string>[] {
  const apiKey = process.env.GEMINI_API_KEY;

  const providers: { label: string; provider: Provider }[] = apiKey
    ? [
        { label: 'gemini-2.0-flash', provider: new GeminiProvider({ apiKey, model: 'gemini-2.0-flash' }) },
        { label: 'gemini-1.5-flash', provider: new GeminiProvider({ apiKey, model: 'gemini-1.5-flash' }) },
        { label: 'stub-baseline', provider: new StubProvider() },
      ]
    : [
        { label: 'demo-fast', provider: delayedDemoProvider('demo-fast', 50) },
        { label: 'demo-slow', provider: delayedDemoProvider('demo-slow', 400) },
        { label: 'stub-baseline', provider: new StubProvider() },
      ];

  return providers.map(({ label, provider }) => ({
    name: label,
    async execute() {
      const ai = new AIBuilder().provider(provider).build();
      return ai.text(question);
    },
    estimateTokens: (result: string) => ({
      inputTokens: Math.ceil(question.length / 4),
      outputTokens: Math.ceil(result.length / 4),
    }),
  }));
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — comparing demo-provider variants (see source for why).\n');
  }
  console.log(`Question: ${question}\n`);

  const evaluator = new Evaluator();
  const summaries = await evaluator.compare(buildCases(), { pricing: illustrativePricing });

  for (const summary of summaries) {
    console.log(`— ${summary.caseName} —`);
    console.log(`  success rate:   ${(summary.successRate * 100).toFixed(0)}%`);
    console.log(`  avg duration:   ${summary.averageDurationMs?.toFixed(1) ?? 'n/a'} ms`);
    console.log(`  avg cost:       $${summary.averageCost?.toFixed(6) ?? 'n/a'}`);
    const firstResult = summary.runs[0]?.result;
    console.log(`  response:       ${firstResult}`);
    console.log();
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 05 — Provider Comparison

**Level 2 · Providers · Intermediate · ~10 min**

## What problem does this solve?
You want to know, concretely, how providers differ on the same
question — latency, cost, and the actual response — before picking one
for production.

## Why would I use this Aidex feature?
`@aidex/evaluation`'s `Evaluator.compare()` runs the same `BenchmarkCase`
shape against however many providers you give it and returns duration,
cost, and success-rate stats for each, uniformly. This example is
honest about a real constraint: Aidex ships only `GeminiProvider` and
`StubProvider` today, so it compares two Gemini configs (or two demo
stand-ins offline) plus a Stub baseline — the mechanics are exactly what
you'd reuse the day a second real vendor `Provider` exists.

## When should I use this in a real project?
Before locking in a model/config choice, or any time you need a
repeatable way to answer "did that prompt change make responses slower
or more expensive."

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to two demo-provider variants
  with simulated latency, so the comparison table still has something
  real to show)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples provider-comparison
```

## Expected output
```
No GEMINI_API_KEY found — comparing demo-provider variants (see source for why).

Question: In one sentence, what makes TypeScript different from JavaScript?

— demo-fast —
  success rate:   100%
  avg duration:   ~50 ms
  avg cost:       $0.000014
  response:       [demo-fast demo answer] TypeScript adds static types on top of JavaScript.

— demo-slow —
  success rate:   100%
  avg duration:   ~400 ms
  ...
```

## Concepts learned
- `Evaluator.compare()` and the `BenchmarkCase` shape
- Cost estimation via `estimateTokens` + `pricing`
- Being honest in an example about what the SDK does and doesn't ship

## Related packages
`@aidex/evaluation`, `@aidex/providers`, `@aidex/sdk`

## Next example
[06 — Observability](../06-observability/README.md) — go deeper on
where those duration/token/cost numbers actually come from.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples provider-comparison`
Expected: exits 0, prints three comparison blocks with duration/cost/response for `demo-fast`, `demo-slow`, `stub-baseline`.

- [ ] **Step 4: Commit**

```bash
git add examples/src/05-provider-comparison
git commit -m "feat(examples): add 05-provider-comparison"
```

---

## Task 7: `06-observability`

**Files:**
- Create: `examples/src/06-observability/index.ts`
- Create: `examples/src/06-observability/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `ObservabilityBus` from `@aidex/observability`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 06 — Observability
 *
 * GeminiProvider auto-instruments itself when built with an
 * ObservabilityBus: every generate() call emits provider/duration/
 * tokens/cost events with zero manual wiring. StubProvider does not —
 * it's a deterministic stand-in, not a billed API call, so there's
 * nothing real to report. This example shows both paths honestly: real
 * auto-instrumentation with a key, manual instrumentation without one.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { ObservabilityBus, ExecutionMetrics } from '@aidex/observability';

const illustrativePricing = { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 };

async function main() {
  const bus = new ObservabilityBus();
  bus.subscribe((event) => {
    console.log(`[event] ${event.event}`, event.metadata ?? {});
  });

  const apiKey = process.env.GEMINI_API_KEY;
  const question = 'What is one benefit of static typing?';

  if (apiKey) {
    console.log('Using GeminiProvider — it auto-reports to the bus on every call.\n');
    const provider = new GeminiProvider({ apiKey, observability: bus, pricing: illustrativePricing });
    const ai = new AIBuilder().provider(provider).build();
    const response = await ai.text(question);
    console.log(`\nResponse: ${response}`);
  } else {
    console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).');
    console.log('StubProvider does not auto-instrument, so this manually');
    console.log('records the same event shape GeminiProvider would emit automatically.\n');

    const provider = new StubProvider();
    const ai = new AIBuilder().provider(provider).build();

    const metrics = new ExecutionMetrics();
    metrics.recordStart();
    const response = await ai.text(question);
    metrics.recordEnd();

    bus.trackProvider({ provider: provider.name, success: true });
    bus.trackDurationFromMetrics(metrics, { provider: provider.name });
    bus.trackCostFromEstimate(
      { inputTokens: Math.ceil(question.length / 4), outputTokens: Math.ceil(response.length / 4), ...illustrativePricing },
      { provider: provider.name }
    );

    console.log(`\nResponse: ${response}`);
  }

  console.log('\nFull timeline:');
  for (const event of bus.getTimeline()) {
    console.log(' ', event);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 06 — Observability

**Level 2 · Providers · Intermediate · ~10 min**

## What problem does this solve?
You need to know, per call, how long a request took, how many tokens
it used, and what it cost — not after the fact from a vendor dashboard,
but inline, in your own logs/metrics pipeline.

## Why would I use this Aidex feature?
`ObservabilityBus` is a plain event bus: `subscribe()` to see everything
that happens. `GeminiProvider` auto-emits `provider`/`duration`/`tokens`/
`cost` events on every `generate()` call when constructed with
`{observability, pricing}` — no manual instrumentation code needed in
your application logic. Providers that aren't wired for this (like
`StubProvider`, which makes no real network call) can still be tracked
manually with the exact same event shape, shown here for symmetry.

## When should I use this in a real project?
Any production Aidex integration where you need cost/latency visibility
— feed `bus.subscribe()` into your existing logger, metrics exporter, or
tracing system.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to manual instrumentation over
  `StubProvider` — both paths are shown in the same file)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples observability
```

## Expected output
A stream of `[event] ...` lines as they're emitted, then the response,
then the full recorded timeline. Event `type`s include `provider`,
`duration`, `tokens` (Gemini only), and `cost`.

## Concepts learned
- `ObservabilityBus.subscribe()` for real-time event streaming
- Automatic instrumentation (`GeminiProvider` + `observability`/`pricing`
  config) vs. manual instrumentation (`ExecutionMetrics`, `trackProvider`,
  `trackDurationFromMetrics`, `trackCostFromEstimate`)
- `bus.getTimeline()` for a full post-hoc record

## Related packages
`@aidex/observability`, `@aidex/providers`, `@aidex/sdk`

## Next example
[07 — Document Intelligence](../07-document-intelligence/README.md) —
your first domain feature package, built on everything so far.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples observability`
Expected: exits 0, prints event lines, a response, then a timeline listing at least `provider`, `duration`, `cost` events.

- [ ] **Step 4: Commit**

```bash
git add examples/src/06-observability
git commit -m "feat(examples): add 06-observability"
```

---

## Task 8: `07-document-intelligence`

**Files:**
- Create: `examples/src/07-document-intelligence/index.ts`
- Create: `examples/src/07-document-intelligence/fixtures/contract.md`
- Create: `examples/src/07-document-intelligence/fixtures/invoice.md`
- Create: `examples/src/07-document-intelligence/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `DOCUMENT_FEATURE_PACKAGE`, `DocumentEngineId` from `@aidex/document`; `Provider` type from `@aidex/core`.

- [ ] **Step 1: Write fixture `fixtures/contract.md`**

```markdown
# Master Services Agreement

This agreement is between Northwind Robotics ("Client") and Acme
Consulting LLC ("Consultant"), effective January 1, 2026.

Consultant will provide software engineering services at a rate of
$180/hour, invoiced monthly. Either party may terminate this agreement
at any time, with no notice period required. Consultant retains no
liability for indirect or consequential damages arising from services
rendered. Client agrees to pay all invoices within 15 days of receipt.
```

- [ ] **Step 2: Write fixture `fixtures/invoice.md`**

```markdown
Invoice #INV-2031
Vendor: Acme Consulting LLC
Issue date: 2026-07-01
Due date: 2026-07-15

Line items:
- Software engineering services (July), 40 hours at $180/hr — $7,200.00
- Cloud infrastructure setup, 1 unit at $450.00 — $450.00

Total due: $7,650.00 USD
```

- [ ] **Step 3: Write `index.ts`**

```typescript
/**
 * 07 — Document Intelligence
 *
 * @aidex/document is the first "feature package" in this course: a
 * bundle of related engines (extract/summarize/classify/keywords/
 * review) registered together via AIBuilder.use(). Every one of these
 * engines JSON-parses the provider's response, so they throw against
 * StubProvider (which returns plain, non-JSON text) — that's why this
 * example carries its own small demo provider that returns valid JSON
 * shaped for whichever operation you pick, only used when no
 * GEMINI_API_KEY is set.
 *
 * document.ocr is intentionally never offered here — it throws
 * NotImplementedError unconditionally in the current SDK.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// A single shared readline interface, not one created per prompt:
// rl.question() only reliably resolves once per process when stdin is
// piped (e.g. automated smoke tests) — every prompt after the first
// silently hangs forever. Reading through the interface's line
// iterator instead works correctly both interactively and piped.
// Returns null when stdin has no more input (EOF).
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

const operations = [
  { key: '1', id: DocumentEngineId.Extract, label: 'Extract structured fields' },
  { key: '2', id: DocumentEngineId.Summarize, label: 'Summarize (plain text, not JSON)' },
  { key: '3', id: DocumentEngineId.Classify, label: 'Classify document type' },
  { key: '4', id: DocumentEngineId.Keywords, label: 'Extract keywords' },
  { key: '5', id: DocumentEngineId.Review, label: 'Review for risk findings' },
] as const;

// Canned JSON per operation — only used in demo mode. document.summarize
// is the one exception in this package that expects plain text back, not
// JSON, so its branch below returns a bare string.
function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case DocumentEngineId.Extract:
      return JSON.stringify({
        fields: { vendor: 'Acme Consulting LLC', effectiveDate: 'January 1, 2026' },
        confidence: { vendor: 0.93 },
      });
    case DocumentEngineId.Classify:
      return JSON.stringify({ documentType: 'services-contract', confidence: 0.88 });
    case DocumentEngineId.Keywords:
      return JSON.stringify({ keywords: ['termination', 'liability', 'invoicing', 'consulting rate'] });
    case DocumentEngineId.Review:
      return JSON.stringify({
        findings: [
          {
            issue: 'No notice period required for termination',
            severity: 'high',
            recommendation: 'Add a minimum 30-day written notice requirement for either party.',
          },
        ],
        summary: 'One high-severity gap found in termination terms.',
      });
    default:
      return 'This agreement outlines a monthly-billed consulting arrangement with no termination notice period and limited consultant liability.';
  }
}

function createProvider(selectedEngineId: string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-document-provider',
    async generate() {
      return { content: demoResponseFor(selectedEngineId) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned JSON per operation.');
    console.log('Set GEMINI_API_KEY to run these against a real model.\n');
  }

  console.log('Choose an operation:');
  for (const op of operations) console.log(`  [${op.key}] ${op.label}`);
  const opChoice = (await ask('> ')) || '1';
  const operation = operations.find((op) => op.key === opChoice) ?? operations[0];

  console.log('\nChoose a document: [1] contract.md  [2] invoice.md');
  const fileChoice = await ask('> ');
  const filename = fileChoice === '2' ? 'invoice.md' : 'contract.md';
  const content = await readFile(path.join(__dirname, 'fixtures', filename), 'utf8');

  const provider = createProvider(operation.id);
  const ai = new AIBuilder().provider(provider).use(DOCUMENT_FEATURE_PACKAGE).build();

  console.log(`\nRunning "${operation.label}" on ${filename}...\n`);
  const result = await ai.engine(operation.id).execute({ source: { content, mimeType: 'text/plain' } });
  console.log(JSON.stringify(result, null, 2));
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Write `README.md`**

```markdown
# 07 — Document Intelligence

**Level 3 · Documents · Intermediate · ~10 min**

## What problem does this solve?
You have real business documents (contracts, invoices) and need
structured information out of them — key fields, a summary, a
classification, keywords, or a risk review — without hand-writing a
prompt from scratch each time.

## Why would I use this Aidex feature?
`@aidex/document` bundles these as ready-made engines behind one
feature package (`DOCUMENT_FEATURE_PACKAGE`), registered in one call via
`AIBuilder.use()`. Each engine has a fixed input/output contract, so
your application code calls `ai.engine(id).execute(input)` and gets a
typed, predictable result — not a paragraph you have to re-parse.

## When should I use this in a real project?
Any pipeline ingesting text documents that need structured downstream
handling — invoice processing, contract review queues, document
classification/routing.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider returning
  canned JSON matching the chosen operation's schema)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples document-intelligence
```
Follow the prompts to pick an operation and a fixture document.

## Expected output
JSON matching the chosen engine's result type, e.g. for "Review":
```json
{
  "findings": [
    {
      "issue": "No notice period required for termination",
      "severity": "high",
      "recommendation": "Add a minimum 30-day written notice requirement for either party."
    }
  ],
  "summary": "One high-severity gap found in termination terms."
}
```

## Concepts learned
- Feature packages: `AIBuilder.use(DOCUMENT_FEATURE_PACKAGE)` registers
  many engines in one call
- `ai.engine(id).execute(input)` — the façade call surface
- Why every document engine requires `mimeType` starting with `text/`,
  and why `document.ocr` is off-limits (not implemented)
- `document.summarize` is the one exception that returns plain text, not JSON

## Related packages
`@aidex/document`, `@aidex/sdk`, `@aidex/providers`

## Next example
[08 — Resume Analyzer](../08-resume-analyzer/README.md) — one focused
document engine, `resume.analyze`, in depth.
```

- [ ] **Step 5: Build and run non-interactively**

Run: `pnpm --filter @aidex/examples build`
Then: `printf "5\n1\n" | node examples/dist/07-document-intelligence/index.js` (selects "Review" on `contract.md`)
Expected: exits 0, prints demo-mode notice, then JSON with a `findings` array and `summary`.

- [ ] **Step 6: Commit**

```bash
git add examples/src/07-document-intelligence
git commit -m "feat(examples): add 07-document-intelligence"
```

---

## Task 9: `08-resume-analyzer`

**Files:**
- Create: `examples/src/08-resume-analyzer/index.ts`
- Create: `examples/src/08-resume-analyzer/fixtures/resume.md`
- Create: `examples/src/08-resume-analyzer/fixtures/job-description.md`
- Create: `examples/src/08-resume-analyzer/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `DOCUMENT_FEATURE_PACKAGE`, `DocumentEngineId` from `@aidex/document`; `Provider` from `@aidex/core`.

- [ ] **Step 1: Write fixture `fixtures/resume.md`**

```markdown
# Jordan Rivera

Backend engineer with 6 years of experience building distributed
systems in TypeScript and Go. Led migration of a monolith to event-
driven microservices, cutting p99 latency by 40%. Comfortable with
Kubernetes, PostgreSQL, and Kafka. Previously at a Series B fintech
startup and a 5000-person logistics company.

Skills: TypeScript, Node.js, Go, PostgreSQL, Kafka, Kubernetes, system design
```

- [ ] **Step 2: Write fixture `fixtures/job-description.md`**

```markdown
We're hiring a Senior Backend Engineer to help scale our event-driven
platform. Must have production experience with TypeScript or Go,
distributed systems design, and Kafka or an equivalent message broker.
Kubernetes experience is a strong plus.
```

- [ ] **Step 3: Write `index.ts`**

```typescript
/**
 * 08 — Resume Analyzer
 *
 * resume.analyze is one focused engine from @aidex/document. Its real
 * output is {candidateName?, skills, experienceYears?, summary?,
 * matchScore?} — NOT strengths/weaknesses/an ATS score. matchScore
 * (0-100) only gets populated when you supply a jobDescription; without
 * one the model is instructed to leave it null. This example is
 * deliberately built around the engine's actual contract rather than a
 * wishlist of fields it doesn't have.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createProvider(): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using a demo provider with a canned analysis.\n');
  return {
    name: 'demo-resume-provider',
    async generate() {
      return {
        content: JSON.stringify({
          candidateName: 'Jordan Rivera',
          skills: ['TypeScript', 'Node.js', 'Go', 'Kafka', 'Kubernetes'],
          experienceYears: 6,
          summary: 'Backend engineer with strong distributed-systems and event-driven architecture background.',
          matchScore: 82,
        }),
      };
    },
  };
}

async function main() {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const resume = await readFile(path.join(fixturesDir, 'resume.md'), 'utf8');
  const jobDescription = await readFile(path.join(fixturesDir, 'job-description.md'), 'utf8');

  const ai = new AIBuilder().provider(createProvider()).use(DOCUMENT_FEATURE_PACKAGE).build();

  const result = await ai.engine(DocumentEngineId.ResumeAnalyze).execute({
    source: { content: resume, mimeType: 'text/plain' },
    jobDescription,
  });

  const analysis = result as {
    candidateName?: string;
    skills: string[];
    experienceYears?: number;
    summary?: string;
    matchScore?: number;
  };

  console.log(`Candidate: ${analysis.candidateName ?? 'unknown'}`);
  console.log(`Experience: ${analysis.experienceYears ?? 'unknown'} years`);
  console.log(`Skills: ${analysis.skills.join(', ')}`);
  console.log(`Summary: ${analysis.summary ?? 'n/a'}`);
  console.log(
    `Match score against job description: ${analysis.matchScore ?? 'n/a'}/100` +
      ' (only populated when a jobDescription is supplied — omit it and this stays unset)'
  );
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 4: Write `README.md`**

```markdown
# 08 — Resume Analyzer

**Level 3 · Documents · Intermediate · ~10 min**

## What problem does this solve?
You want a structured read on a resume — skills, experience, and how
well it matches a specific role — instead of skimming it manually.

## Why would I use this Aidex feature?
`resume.analyze` is a single-purpose engine with a fixed output
contract: `{candidateName?, skills, experienceYears?, summary?,
matchScore?}`. Supplying an optional `jobDescription` alongside the
resume gets you `matchScore` (0-100); omit it and that field is simply
left unset — there's no separate call needed for "with vs. without a
target role."

## When should I use this in a real project?
Early-stage resume triage against a specific job posting — this
produces a structured signal to sort/filter candidates, not a final
hiring decision.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider returning a
  canned analysis)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples resume-analyzer
```

## Expected output
```
Candidate: Jordan Rivera
Experience: 6 years
Skills: TypeScript, Node.js, Go, Kafka, Kubernetes
Summary: Backend engineer with strong distributed-systems and event-driven architecture background.
Match score against job description: 82/100 (only populated when a jobDescription is supplied — omit it and this stays unset)
```

## Concepts learned
- `resume.analyze`'s real (verified) output contract — not a wishlist
- Optional input fields that gate optional output fields (`jobDescription` → `matchScore`)
- Why example code should be checked against actual engine behavior, not assumed field names

## Related packages
`@aidex/document`, `@aidex/sdk`

## Next example
[09 — Brand Kit Generator](../09-brand-kit-generator/README.md) — a
different feature package, `@aidex/design`.
```

- [ ] **Step 5: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples resume-analyzer`
Expected: exits 0, prints candidate name, experience, skills, summary, and a numeric match score.

- [ ] **Step 6: Commit**

```bash
git add examples/src/08-resume-analyzer
git commit -m "feat(examples): add 08-resume-analyzer"
```

---

## Task 10: `09-brand-kit-generator`

**Files:**
- Create: `examples/src/09-brand-kit-generator/index.ts`
- Create: `examples/src/09-brand-kit-generator/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider` from `@aidex/providers`; `DESIGN_FEATURE_PACKAGE`, `DesignEngineId` from `@aidex/design`; `Provider` from `@aidex/core`; `createInterface` from `node:readline/promises`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 09 — Brand Kit Generator
 *
 * @aidex/design's engines are all text-only today — `design.logo`'s
 * "asset" is a data:text/plain,... URI carrying a text description, not
 * a rendered image. This example says that plainly rather than
 * implying real image generation, and calls four engines
 * (brand/palette/typography/logo) from one brief to assemble a
 * composite "brand kit" printout.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DESIGN_FEATURE_PACKAGE, DesignEngineId } from '@aidex/design';

// A single shared readline interface (see 03-interactive-chat for the
// full rationale: rl.question() only reliably resolves once per
// process under piped/automated input). This example only asks one
// question, but the pattern stays consistent across the whole course.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case DesignEngineId.Brand:
      return JSON.stringify({
        logoDescription: 'A minimalist geometric leaf mark in deep green, paired with a clean sans-serif wordmark',
        palette: ['#0B3D2E', '#F4F1E9', '#C9A227'],
        typography: ['Inter', 'Fraunces'],
        guidelines: 'Use the leaf mark standalone only on light backgrounds.',
      });
    case DesignEngineId.Palette:
      return JSON.stringify({
        colors: [
          { name: 'Forest', hex: '#0B3D2E', role: 'primary' },
          { name: 'Sand', hex: '#F4F1E9', role: 'background' },
          { name: 'Gold', hex: '#C9A227', role: 'accent' },
        ],
      });
    case DesignEngineId.Typography:
      return JSON.stringify({
        pairings: [{ heading: 'Fraunces', body: 'Inter', notes: 'Serif display paired with a neutral sans body' }],
      });
    default: // DesignEngineId.Logo
      return JSON.stringify({
        primaryDescription: 'A minimalist geometric leaf mark in deep green',
        variantDescriptions: ['Monochrome version for dark backgrounds', 'Icon-only mark for favicon use'],
      });
  }
}

function createProvider(currentEngineId: () => string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-design-provider',
    async generate() {
      return { content: demoResponseFor(currentEngineId()) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned brand-kit JSON.');
    console.log('Set GEMINI_API_KEY to generate a real brand kit.\n');
  }

  const brief = (await ask('Describe your company in one sentence: ')) || 'A sustainable coffee subscription startup';

  let engineId: string = DesignEngineId.Brand;
  const provider = createProvider(() => engineId);
  const ai = new AIBuilder().provider(provider).use(DESIGN_FEATURE_PACKAGE).build();

  console.log(`\nGenerating brand kit for: "${brief}"\n`);

  engineId = DesignEngineId.Brand;
  const brand = (await ai.engine(engineId).execute({ brief })) as {
    logo: { assetUrl: string };
    palette: string[];
    typography: string[];
    guidelines?: string;
  };

  engineId = DesignEngineId.Palette;
  const palette = (await ai.engine(engineId).execute({ brief })) as {
    colors: { name: string; hex: string; role?: string }[];
  };

  engineId = DesignEngineId.Typography;
  const typography = (await ai.engine(engineId).execute({ brief })) as {
    pairings: { heading: string; body: string; notes?: string }[];
  };

  engineId = DesignEngineId.Logo;
  const logo = (await ai.engine(engineId).execute({ brief })) as {
    primary: { assetUrl: string };
    variants?: { assetUrl: string }[];
  };

  console.log('Brand voice & guidelines:');
  console.log(`  ${brand.guidelines ?? '(none provided)'}\n`);

  console.log('Color palette:');
  for (const color of palette.colors) console.log(`  ${color.name} — ${color.hex}${color.role ? ` (${color.role})` : ''}`);

  console.log('\nTypography pairings:');
  for (const pairing of typography.pairings) console.log(`  Heading: ${pairing.heading} / Body: ${pairing.body}`);

  console.log('\nLogo concept (text description — no image is actually rendered, see README):');
  console.log(`  ${decodeURIComponent(logo.primary.assetUrl.replace('data:text/plain,', ''))}`);
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 09 — Brand Kit Generator

**Level 4 · Design · Intermediate · ~10 min**

## What problem does this solve?
You have a one-line company description and want a starting-point
brand kit — voice, palette, typography, and a logo concept — instead of
staring at a blank page.

## Why would I use this Aidex feature?
`@aidex/design` bundles four complementary engines behind
`DESIGN_FEATURE_PACKAGE`. Calling `brand`, `palette`, `typography`, and
`logo` from the same brief gives you a coherent starting kit in one
script instead of four disconnected prompts.

## When should I use this in a real project?
Early-stage brand exploration — a first draft to react to and refine
with a real designer, not a replacement for one. **Important:** every
"logo"/"asset" output here is a text description wrapped in a
`data:text/plain,...` URI, not a rendered image — Aidex's provider
abstraction is text-only today, and this example says so rather than
implying otherwise.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider with canned
  brand-kit JSON)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples brand-kit-generator
```

## Expected output
Prompts for a company description, then prints brand guidelines, a
color palette, typography pairings, and a logo text concept.

## Concepts learned
- Composing several engines from one feature package into one output
- `DESIGN_FEATURE_PACKAGE` engine ID naming (`design.brand`, `.palette`, `.typography`, `.logo`)
- Being explicit about a real limitation (text-only "visual" output) instead of hiding it

## Related packages
`@aidex/design`, `@aidex/sdk`

## Next example
[10 — Marketing Campaign](../10-marketing-campaign/README.md) — a
similar multi-engine composition, for `@aidex/marketing`.
```

- [ ] **Step 3: Build and run non-interactively**

Run: `pnpm --filter @aidex/examples build`
Then: `printf "\n" | node examples/dist/09-brand-kit-generator/index.js` (accepts default brief)
Expected: exits 0, prints demo notice, brand guidelines, palette, typography, and a logo text concept.

- [ ] **Step 4: Commit**

```bash
git add examples/src/09-brand-kit-generator
git commit -m "feat(examples): add 09-brand-kit-generator"
```

---

## Task 11: `10-marketing-campaign`

**Files:**
- Create: `examples/src/10-marketing-campaign/index.ts`
- Create: `examples/src/10-marketing-campaign/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `MARKETING_FEATURE_PACKAGE`, `MarketingEngineId` from `@aidex/marketing`; `Provider` from `@aidex/core`; `createInterface` from `node:readline/promises`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 10 — Marketing Campaign
 *
 * Four @aidex/marketing engines (email copy, social caption, SEO
 * keywords, campaign plan) assembled from one product brief into a
 * single campaign packet — the same "compose a feature package's
 * engines" pattern as 09-brand-kit-generator, applied to a different
 * domain.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { MARKETING_FEATURE_PACKAGE, MarketingEngineId } from '@aidex/marketing';

// A single shared readline interface (see 03-interactive-chat for the
// full rationale: rl.question() only reliably resolves once per
// process under piped/automated input). This example only asks one
// question, but the pattern stays consistent across the whole course.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case MarketingEngineId.EmailCopy:
      return JSON.stringify({
        subject: 'Your weekly product digest is here',
        body: "Hi there — here's what shipped this week, and why it matters for your workflow.",
      });
    case MarketingEngineId.SocialCaption:
      return JSON.stringify({ caption: 'New week, new ship. Heres what we built for you. 🚀' });
    case MarketingEngineId.SeoKeywords:
      return JSON.stringify({
        keywords: [
          { keyword: 'ai sdk for typescript', estimatedVolume: 1200, difficulty: 'medium' },
          { keyword: 'build ai app node.js', estimatedVolume: 800, difficulty: 'low' },
        ],
      });
    default: // MarketingEngineId.CampaignPlan
      return JSON.stringify({
        objectives: [{ goal: 'Increase trial signups by 20%', metric: 'signup conversion rate' }],
        summary: 'A four-week content-led campaign targeting developer audiences.',
      });
  }
}

function createProvider(currentEngineId: () => string): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-marketing-provider',
    async generate() {
      return { content: demoResponseFor(currentEngineId()) };
    },
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned campaign JSON.');
    console.log('Set GEMINI_API_KEY to generate a real campaign.\n');
  }

  const brief =
    (await ask('Describe your product or launch in one sentence: ')) ||
    'A developer SDK that makes it easy to build AI-powered TypeScript applications';

  let engineId: string = MarketingEngineId.EmailCopy;
  const provider = createProvider(() => engineId);
  const ai = new AIBuilder().provider(provider).use(MARKETING_FEATURE_PACKAGE).build();

  console.log(`\nBuilding a campaign packet for: "${brief}"\n`);

  engineId = MarketingEngineId.EmailCopy;
  const email = (await ai.engine(engineId).execute({ brief })) as { subject: string; body: string };

  engineId = MarketingEngineId.SocialCaption;
  const social = (await ai.engine(engineId).execute({ brief })) as { caption: string };

  engineId = MarketingEngineId.SeoKeywords;
  const seo = (await ai.engine(engineId).execute({ brief })) as {
    keywords: { keyword: string; estimatedVolume?: number; difficulty?: string }[];
  };

  engineId = MarketingEngineId.CampaignPlan;
  const plan = (await ai.engine(engineId).execute({ brief })) as {
    objectives: { goal: string; metric?: string }[];
    channels: string[];
    summary: string;
  };

  console.log('Email:');
  console.log(`  Subject: ${email.subject}`);
  console.log(`  Body: ${email.body}\n`);

  console.log('Social caption:');
  console.log(`  ${social.caption}\n`);

  console.log('SEO keywords:');
  for (const kw of seo.keywords) console.log(`  ${kw.keyword} (volume: ${kw.estimatedVolume ?? 'n/a'}, difficulty: ${kw.difficulty ?? 'n/a'})`);

  console.log('\nCampaign plan:');
  console.log(`  Channels: ${plan.channels.join(', ')}`);
  for (const objective of plan.objectives) console.log(`  Objective: ${objective.goal}${objective.metric ? ` (metric: ${objective.metric})` : ''}`);
  console.log(`  Summary: ${plan.summary}`);
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 10 — Marketing Campaign

**Level 5 · Marketing · Intermediate · ~10 min**

## What problem does this solve?
Launching something needs several coordinated pieces of copy — an
email, a social post, SEO keywords, a campaign plan — usually written
one at a time, inconsistently.

## Why would I use this Aidex feature?
`@aidex/marketing`'s engines share one brief format (`{brief,
targetAudience?}`), so the same one-sentence description drives all
four outputs, assembled here into one packet.

## When should I use this in a real project?
Fast first-draft campaign collateral for a product launch or feature
announcement — a starting point for a marketer to edit, not
publish-ready copy.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to a demo provider with canned
  campaign JSON)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples marketing-campaign
```

## Expected output
Prompts for a one-sentence brief, then prints an email (subject +
body), a social caption, SEO keywords with volume/difficulty, and a
campaign plan with objectives and a summary.

## Concepts learned
- Composing multiple engines from one feature package around a shared brief
- `marketing.campaign.plan`'s `channels` field is echoed from your input, not model-generated — read the source, not just the name, before trusting a field
- Consistent "assemble a packet" pattern, same shape as 09-brand-kit-generator

## Related packages
`@aidex/marketing`, `@aidex/sdk`

## Next example
[11 — Workflow Orchestration](../11-workflow-orchestration/README.md) —
chain engines together with real data dependencies between steps.
```

- [ ] **Step 3: Build and run non-interactively**

Run: `pnpm --filter @aidex/examples build`
Then: `printf "\n" | node examples/dist/10-marketing-campaign/index.js`
Expected: exits 0, prints demo notice, then email/social/SEO/plan sections.

- [ ] **Step 4: Commit**

```bash
git add examples/src/10-marketing-campaign
git commit -m "feat(examples): add 10-marketing-campaign"
```

---

## Task 12: `11-workflow-orchestration`

**Files:**
- Create: `examples/src/11-workflow-orchestration/index.ts`
- Create: `examples/src/11-workflow-orchestration/fixtures/article.md`
- Create: `examples/src/11-workflow-orchestration/README.md`

**Interfaces:**
- Consumes: `AIBuilder`, `AI` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `DOCUMENT_FEATURE_PACKAGE`, `DocumentEngineId` from `@aidex/document`; `Workflow`, `WorkflowExecutor`, `WorkflowCancelledError` from `@aidex/workflow`; `Provider` from `@aidex/core`.

- [ ] **Step 1: Write fixture `fixtures/article.md`**

```markdown
# Why Event-Driven Architectures Age Well

Event-driven systems decouple producers from consumers, so teams can
ship independently as long as they agree on event shape. This reduces
the blast radius of a bad deploy: one service failing to process an
event doesn't take down the service that emitted it. The tradeoff is
operational complexity — you need good tracing, dead-letter handling,
and schema versioning discipline, or debugging becomes archaeology.
```

- [ ] **Step 2: Write `index.ts`**

```typescript
/**
 * 11 — Workflow Orchestration
 *
 * A real multi-engine pipeline: extract → summarize → translate →
 * review, chained via @aidex/workflow's generic Workflow/
 * WorkflowExecutor. Each WorkflowStep closes over the SDK's `ai`
 * instance and calls a document engine, storing its result on shared
 * state for later steps — translate's input is literally derived from
 * summarize's output, a real data dependency, not just four unrelated
 * calls run in sequence. A second run demonstrates cancellation via
 * AbortController.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIBuilder, type AI } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';
import { Workflow, WorkflowExecutor, WorkflowCancelledError, type WorkflowEvent } from '@aidex/workflow';

// `import.meta.dirname` needs Node 20.11+/21.2+ — this repo supports
// Node >=18, so resolve __dirname the portable way instead.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface PipelineState {
  source: { content: string; mimeType: string };
  extracted?: { fields: Record<string, string> };
  summary?: string;
  translated?: string;
  reviewFindings?: { issue: string; severity: string; recommendation: string }[];
}

let currentStepEngineId = DocumentEngineId.Extract;

function demoResponseFor(engineId: string): string {
  switch (engineId) {
    case DocumentEngineId.Extract:
      return JSON.stringify({ fields: { topic: 'event-driven architecture', tradeoff: 'operational complexity' } });
    case DocumentEngineId.Translate:
      return JSON.stringify({ translatedText: 'Los sistemas orientados a eventos desacoplan productores de consumidores.', detectedSourceLanguage: 'English' });
    case DocumentEngineId.Review:
      return JSON.stringify({
        findings: [{ issue: 'No mention of monitoring tooling choice', severity: 'low', recommendation: 'Name at least one tracing tool as an example.' }],
        summary: 'Solid overview, one minor gap.',
      });
    default: // Summarize — plain text, not JSON
      return 'Event-driven architecture decouples services for independent deploys, at the cost of needing strong tracing and schema discipline.';
  }
}

function createProvider(): Provider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  return {
    name: 'demo-workflow-provider',
    async generate() {
      return { content: demoResponseFor(currentStepEngineId) };
    },
  };
}

function buildPipeline(ai: AI): Workflow<PipelineState> {
  const workflow = new Workflow<PipelineState>('document-pipeline');

  workflow.addStep({
    name: 'extract',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Extract;
      state.extracted = (await ai.engine(DocumentEngineId.Extract).execute({ source: state.source })) as PipelineState['extracted'];
    },
  });

  workflow.addStep({
    name: 'summarize',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Summarize;
      const result = (await ai.engine(DocumentEngineId.Summarize).execute({ source: state.source })) as { summary: string };
      state.summary = result.summary;
    },
  });

  workflow.addStep({
    name: 'translate',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Translate;
      // Real dependency: this step's input is the previous step's output,
      // not the original source — proof this is a pipeline, not four
      // independent calls run back to back.
      const result = (await ai.engine(DocumentEngineId.Translate).execute({
        source: { content: state.summary ?? '', mimeType: 'text/plain' },
        targetLanguage: 'Spanish',
      })) as { translatedText: string };
      state.translated = result.translatedText;
    },
  });

  workflow.addStep({
    name: 'review',
    async execute(state) {
      currentStepEngineId = DocumentEngineId.Review;
      const result = (await ai.engine(DocumentEngineId.Review).execute({ source: state.source })) as {
        findings: PipelineState['reviewFindings'];
      };
      state.reviewFindings = result.findings;
    },
  });

  return workflow;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found — using a demo provider with canned per-step JSON.\n');
  }

  const content = await readFile(path.join(__dirname, 'fixtures', 'article.md'), 'utf8');
  const ai = new AIBuilder().provider(createProvider()).use(DOCUMENT_FEATURE_PACKAGE).build();
  const workflow = buildPipeline(ai);
  const executor = new WorkflowExecutor();

  console.log('Running pipeline: extract → summarize → translate → review\n');

  const finalState = await executor.execute(
    workflow,
    { source: { content, mimeType: 'text/plain' } },
    {
      onEvent: (event: WorkflowEvent) => {
        console.log(`[workflow event] ${event.type}${event.stepName ? ` (${event.stepName})` : ''}`);
      },
    }
  );

  console.log('\nExtracted fields:', finalState.extracted?.fields);
  console.log('Summary:', finalState.summary);
  console.log('Translated summary (Spanish):', finalState.translated);
  console.log('Review findings:', finalState.reviewFindings);

  console.log('\nNow demonstrating cancellation — aborting immediately:');
  const controller = new AbortController();
  controller.abort();
  try {
    await executor.execute(buildPipeline(ai), { source: { content, mimeType: 'text/plain' } }, { signal: controller.signal });
  } catch (error) {
    if (error instanceof WorkflowCancelledError) {
      console.log(`Workflow cancelled as expected (stepName: ${error.stepName ?? 'n/a'}).`);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 3: Write `README.md`**

```markdown
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
```

- [ ] **Step 4: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples workflow-orchestration`
Expected: exits 0, prints workflow events for all 4 steps, final state fields, then the cancellation demonstration line.

- [ ] **Step 5: Commit**

```bash
git add examples/src/11-workflow-orchestration
git commit -m "feat(examples): add 11-workflow-orchestration"
```

---

## Task 13: `12-plugin-example`

**Files:**
- Create: `examples/src/12-plugin-example/index.ts`
- Create: `examples/src/12-plugin-example/README.md`

**Interfaces:**
- Consumes: `Aidex` from `@aidex/core`; `PluginManager`, `ExtendedPlugin` from `@aidex/plugins`; `Provider` from `@aidex/core`; `StubProvider` from `@aidex/providers`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 12 — Plugin Example
 *
 * ExtendedPlugin is how you bundle related engines/prompts/tools into
 * one installable unit. PluginManager — not AIBuilder/AI — is what
 * consumes plugins, and it requires a raw `Aidex` kernel instance to
 * construct. That's not a gap in the SDK façade; it's a deliberate
 * two-tier architecture: `Aidex` is the low-level kernel, `AIBuilder`/
 * `AI` is a higher-level façade built for the common case of "one
 * provider, some engines, some prompts" — plugin composition lives at
 * the kernel tier because plugins can register strategies too, a
 * concept the façade doesn't expose.
 */
import { Aidex, type Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { PluginManager, type ExtendedPlugin } from '@aidex/plugins';

const slugPlugin: ExtendedPlugin = {
  name: 'slug-tools',
  registerEngines() {
    return [
      {
        id: 'text.slugify',
        name: 'Slugify',
        description: 'Converts a title into a URL-safe slug',
        version: '1.0.0',
        async execute(context) {
          const input = context.request?.input as { title: string } | undefined;
          const title = input?.title ?? '';
          return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        },
      },
    ];
  },
  registerPrompts() {
    return [
      {
        id: 'blog-intro',
        version: '1.0.0',
        template: 'Write a one-sentence intro for a blog post titled "{{title}}".',
        variables: ['title'],
      },
    ];
  },
  registerTools() {
    return [
      {
        id: 'word-count',
        name: 'Word Count',
        description: 'Counts words in a string',
        async execute(input) {
          const text = input as string;
          return text.trim().split(/\s+/).filter(Boolean).length;
        },
      },
    ];
  },
};

async function main() {
  const provider: Provider = new StubProvider();
  const aidex = new Aidex({ provider }); // the raw kernel — see comment above for why

  const manager = new PluginManager(aidex);

  console.log('Installing plugin "slug-tools"...');
  manager.use(slugPlugin);
  console.log(`Installed: ${manager.isInstalled('slug-tools')}\n`);

  console.log('Executing its engine:');
  const slug = await manager.getEngineRegistry().execute('text.slugify', {
    config: { provider },
    provider,
    request: { strategy: 'text.slugify', input: { title: 'Ten Tips For Better TypeScript' } },
  });
  console.log(`  "Ten Tips For Better TypeScript" -> "${slug}"\n`);

  console.log('Rendering its prompt template:');
  const rendered = manager.getPromptRegistry().render('blog-intro', { title: 'Ten Tips For Better TypeScript' });
  console.log(`  ${rendered}\n`);

  console.log('Executing its tool:');
  const wordCount = await manager.getToolRegistry().execute('word-count', 'Aidex plugins bundle engines, prompts, and tools together.');
  console.log(`  word count: ${wordCount}`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 12 — Plugin Example

**Level 7 · Plugins · Advanced · ~10 min**

## What problem does this solve?
You have a set of related engines, prompts, and tools that always ship
together — you want to install them as one unit, not wire each up
individually.

## Why would I use this Aidex feature?
`ExtendedPlugin` bundles `registerEngines()`/`registerPrompts()`/
`registerTools()` into one object; `PluginManager.use(plugin)`
registers everything it returns in one call. Note this uses the raw
`Aidex` kernel, not `AIBuilder`/`AI` — that's intentional, not a
limitation to apologize for (see the code comment for the full
architectural reason).

## When should I use this in a real project?
Distributing a reusable bundle of domain-specific engines/prompts/tools
— an internal team library, or a third-party extension to Aidex.

## Requirements
- Node ≥18, pnpm — no API key needed (uses `StubProvider` directly, since
  this example's engine/tool are deterministic and don't call an LLM).

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples plugin-example
```

## Expected output
```
Installing plugin "slug-tools"...
Installed: true

Executing its engine:
  "Ten Tips For Better TypeScript" -> "ten-tips-for-better-typescript"

Rendering its prompt template:
  Write a one-sentence intro for a blog post titled "Ten Tips For Better TypeScript".

Executing its tool:
  word count: 9
```

## Concepts learned
- `ExtendedPlugin`'s three registration hooks and `PluginManager.use()`
- Why `PluginManager` needs a raw `Aidex`, not the SDK façade — two
  deliberate composition tiers, not a gap
- Engines don't have to call an LLM at all (see `text.slugify`)

## Related packages
`@aidex/core`, `@aidex/plugins`, `@aidex/providers`

## Next example
[13 — Tool Registry](../13-tool-registry/README.md) — a closer look at
permission-gated tool execution.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples plugin-example`
Expected: exits 0, prints installed status, slug output, rendered prompt, and word count.

- [ ] **Step 4: Commit**

```bash
git add examples/src/12-plugin-example
git commit -m "feat(examples): add 12-plugin-example"
```

---

## Task 14: `13-tool-registry`

**Files:**
- Create: `examples/src/13-tool-registry/index.ts`
- Create: `examples/src/13-tool-registry/README.md`

**Interfaces:**
- Consumes: `ToolRegistry`, `ToolPermissionDeniedError`, `Tool` from `@aidex/tools`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 13 — Tool Registry
 *
 * Tools are permission-gated: a Tool declares which permission strings
 * it requires, and ToolRegistry.execute() takes the CALLER's granted
 * permissions as its third argument, comparing them at call time — there's
 * no separate "grant" step to forget. This matters any time a tool can
 * take a real-world action (send an email, write a file, hit a paid
 * API) and you need per-call authorization, not just per-registration.
 */
import { ToolRegistry, ToolPermissionDeniedError, type Tool } from '@aidex/tools';

const sendEmailTool: Tool<{ to: string; subject: string }, string> = {
  id: 'email.send',
  name: 'Send Email',
  description: 'Sends an email (simulated for this example)',
  permissions: ['email:send'],
  async execute(input) {
    return `Email sent to ${input.to}: "${input.subject}"`;
  },
};

async function main() {
  const registry = new ToolRegistry();
  registry.register(sendEmailTool);

  console.log('Executing with the required permission granted:');
  const result = await registry.execute('email.send', { to: 'ops@example.com', subject: 'Deploy complete' }, ['email:send']);
  console.log(`  ${result}\n`);

  console.log('Executing WITHOUT the required permission:');
  try {
    await registry.execute('email.send', { to: 'ops@example.com', subject: 'Deploy complete' }, []);
  } catch (error) {
    if (error instanceof ToolPermissionDeniedError) {
      console.log(`  Denied, as expected: missing permissions [${error.missingPermissions.join(', ')}]`);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 13 — Tool Registry

**Level 7 · Plugins · Intermediate · ~5 min**

## What problem does this solve?
A tool that takes a real action (sending email, calling a paid API)
shouldn't run just because it's registered — the caller needs to prove,
per call, that they're allowed to invoke it.

## Why would I use this Aidex feature?
`ToolRegistry.execute(id, input, grantedPermissions)` checks the
caller-supplied permissions against the tool's declared `permissions`
at the moment of execution — there's no separate grant/revoke API to
get out of sync with reality.

## When should I use this in a real project?
Any tool with side effects your application doesn't want triggered
unconditionally — gate it by permission and pass exactly what the
current caller/context is allowed to use.

## Requirements
- Node ≥18, pnpm — no API key needed, purely local.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples tool-registry
```

## Expected output
```
Executing with the required permission granted:
  Email sent to ops@example.com: "Deploy complete"

Executing WITHOUT the required permission:
  Denied, as expected: missing permissions [email:send]
```

## Concepts learned
- `Tool.permissions` + `ToolRegistry.execute(id, input, granted)`
- `ToolPermissionDeniedError` and its `missingPermissions` field

## Related packages
`@aidex/tools`

## Next example
[14 — Custom Engine](../14-custom-engine/README.md) — the flagship
closing example: build and register your own engine through the modern
SDK façade.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples tool-registry`
Expected: exits 0, prints the granted-permission success line then the denied-permission line.

- [ ] **Step 4: Commit**

```bash
git add examples/src/13-tool-registry
git commit -m "feat(examples): add 13-tool-registry"
```

---

## Task 15: `14-custom-engine`

**Files:**
- Create: `examples/src/14-custom-engine/index.ts`
- Create: `examples/src/14-custom-engine/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `Engine` from `@aidex/engines`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 14 — Custom Engine
 *
 * The modern, façade path for a custom engine: register it with
 * `AIBuilder().engine(myEngine)`, then call it with
 * `ai.engine(id).execute(input)` — exactly the same call surface as
 * any built-in feature-package engine from earlier examples. (An older
 * version of this example drove a raw EngineRegistry directly, because
 * the façade didn't support single-engine registration yet — it does
 * now, so this is the path to teach.)
 *
 * Also worth noticing: an Engine doesn't have to call an LLM at all. It
 * only needs to satisfy `execute(context): Promise<TResult>` — this one
 * is a fully deterministic reading-time/slug calculator.
 */
import { AIBuilder } from '@aidex/sdk';
import type { Engine } from '@aidex/engines';
import { StubProvider } from '@aidex/providers';

interface BlogPostInput {
  title: string;
  body: string;
}

interface BlogPostAnalysis {
  slug: string;
  wordCount: number;
  readingTimeMinutes: number;
}

const blogPostAnalyzer: Engine<BlogPostAnalysis> = {
  id: 'content.analyze-post',
  name: 'Blog Post Analyzer',
  description: 'Computes a URL slug, word count, and estimated reading time for a blog post',
  version: '1.0.0',
  async execute(context) {
    const input = context.request?.input as BlogPostInput;
    const words = input.body.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    return {
      slug: input.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, ''),
      wordCount,
      // Average adult reading speed: ~200 words/minute.
      readingTimeMinutes: Math.max(1, Math.round(wordCount / 200)),
    };
  },
};

async function main() {
  // StubProvider is required by AIBuilder even though this engine never
  // calls it — every AI instance needs a Provider, but not every engine
  // uses one. That's a valid, common shape for a custom engine.
  const ai = new AIBuilder().provider(new StubProvider()).engine(blogPostAnalyzer).build();

  const post: BlogPostInput = {
    title: 'Ten Tips For Better TypeScript',
    body: 'TypeScript rewards small, deliberate habits. Start with strict mode, prefer narrow types over any, and let inference do the work it is good at. '.repeat(3),
  };

  const analysis = await ai.engine<BlogPostAnalysis>('content.analyze-post').execute(post);

  console.log(`Title: ${post.title}`);
  console.log(`Slug: ${analysis.slug}`);
  console.log(`Word count: ${analysis.wordCount}`);
  console.log(`Estimated reading time: ${analysis.readingTimeMinutes} minute(s)`);
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 14 — Custom Engine

**Level 8 · Custom Engines · Advanced · ~10 min**

## What problem does this solve?
Every prior example used engines Aidex ships. This one shows how to
build and register your own — the same mechanism `@aidex/document`/
`@aidex/design`/`@aidex/marketing` use internally, available to any
application.

## Why would I use this Aidex feature?
`AIBuilder().engine(myEngine).build()` registers a custom `Engine`
directly on your `AI` instance; `ai.engine(id).execute(input)` calls it
— identical call shape to every built-in engine you've used so far. An
`Engine` is just `{id, name, description, version, execute(context)}` —
nothing about it requires calling an LLM, as this example's fully
deterministic reading-time calculator demonstrates.

## When should I use this in a real project?
Any reusable, typed unit of work you want to compose the same way as
Aidex's built-in engines — deterministic calculations, internal API
calls, or your own LLM-backed logic, all through one consistent
`ai.engine(id).execute()` surface.

## Requirements
- Node ≥18, pnpm — no API key needed, this engine never calls the provider.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples custom-engine
```

## Expected output
```
Title: Ten Tips For Better TypeScript
Slug: ten-tips-for-better-typescript
Word count: 84
Estimated reading time: 1 minute(s)
```

## Concepts learned
- `AIBuilder().engine(e).build()` + `ai.engine(id).execute(input)` — the
  modern façade path (supersedes driving `EngineRegistry` by hand)
- The full `Engine` contract, and that it doesn't require a `Provider` call
- Every `AI` instance still needs a `Provider` even if no registered engine uses it

## Related packages
`@aidex/engines`, `@aidex/sdk`, `@aidex/providers`

## Next example
[15 — Real-World Assistant](../15-real-world-assistant/README.md) — the
capstone: every concept from levels 1-8, composed into one small app.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples custom-engine`
Expected: exits 0, prints title, slug, word count, and reading time.

- [ ] **Step 4: Commit**

```bash
git add examples/src/14-custom-engine
git commit -m "feat(examples): add 14-custom-engine"
```

---

## Task 16: `15-real-world-assistant` (Capstone)

**Files:**
- Create: `examples/src/15-real-world-assistant/index.ts`
- Create: `examples/src/15-real-world-assistant/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`/`StubProvider` from `@aidex/providers`; `PromptRegistry`, type `PromptTemplate` from `@aidex/prompts`; `DOCUMENT_FEATURE_PACKAGE`, `DocumentEngineId` from `@aidex/document`; `ObservabilityBus` from `@aidex/observability`; `Provider` from `@aidex/core`; `createInterface` from `node:readline/promises`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 15 — Real-World Assistant (Capstone)
 *
 * Every piece here was taught individually in an earlier example:
 * provider selection (03), an optional system prompt (03), a versioned
 * prompt template (02), the AIBuilder/AI façade (01), observability
 * (06), and — when the user pastes a long text — the document.summarize
 * engine (07). This example's only job is showing them composed into
 * one small interactive assistant, looping until "exit". Nothing new is
 * introduced here; if a line of code needs an unfamiliar concept
 * explained, that's a bug in this file, not in the reader's understanding.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import type { Provider } from '@aidex/core';
import { PromptRegistry, type PromptTemplate } from '@aidex/prompts';
import { DOCUMENT_FEATURE_PACKAGE, DocumentEngineId } from '@aidex/document';
import { ObservabilityBus, ExecutionMetrics } from '@aidex/observability';

const color = {
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
};

// A single shared readline interface, not one created per prompt:
// rl.question() only reliably resolves once per process when stdin is
// piped (e.g. automated smoke tests) — every prompt after the first
// silently hangs forever. Reading through the interface's line
// iterator instead works correctly both interactively and piped.
// Returns null when stdin has no more input (EOF) rather than looping.
const rl = createInterface({ input: stdin, output: stdout });
const rlLines = rl[Symbol.asyncIterator]();

async function ask(question: string): Promise<string | null> {
  stdout.write(question);
  const { value, done } = await rlLines.next();
  return done ? null : value.trim();
}

const requestTemplate: PromptTemplate = {
  id: 'assistant-request',
  version: '1.0.0',
  template: '{{systemPrompt}}\n\nUser request: {{request}}',
  variables: ['systemPrompt', 'request'],
};

async function chooseProvider(bus: ObservabilityBus): Promise<Provider> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log(color.yellow('No GEMINI_API_KEY found — running with StubProvider (demo mode).\n'));
    return new StubProvider();
  }
  const choice = await ask('Choose a provider — [1] Gemini  [2] Stub (demo): ');
  if (choice === '2') return new StubProvider();
  return new GeminiProvider({ apiKey, observability: bus, pricing: { inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 } });
}

async function main() {
  const bus = new ObservabilityBus();
  const prompts = new PromptRegistry();
  prompts.register(requestTemplate);

  const provider = await chooseProvider(bus);
  const ai = new AIBuilder().provider(provider).use(DOCUMENT_FEATURE_PACKAGE).build();

  const systemPrompt =
    (await ask('Optional system prompt (press Enter for a sensible default): ')) ||
    'You are a concise, helpful assistant for a software developer.';

  console.log(color.dim("\nCommands: type a request, 'summarize' to paste text to summarize, or 'exit' to quit.\n"));

  while (true) {
    const request = await ask(color.cyan('You: '));
    if (request === null || request.toLowerCase() === 'exit' || request.toLowerCase() === 'quit') {
      console.log('Goodbye!');
      break;
    }
    if (!request) continue;

    const metrics = new ExecutionMetrics();
    metrics.recordStart();

    if (request.toLowerCase() === 'summarize') {
      const text = (await ask('Paste the text to summarize: ')) ?? '';
      const result = (await ai.engine(DocumentEngineId.Summarize).execute({
        source: { content: text, mimeType: 'text/plain' },
      })) as { summary: string };
      metrics.recordEnd();
      bus.trackDurationFromMetrics(metrics, { operation: 'document.summarize' });

      console.log(`${color.dim('Assistant:')} ${result.summary}`);
    } else {
      const rendered = prompts.render('assistant-request', { systemPrompt, request });
      const reply = await ai.text(rendered);
      metrics.recordEnd();
      bus.trackDurationFromMetrics(metrics, { operation: 'ai.text' });

      console.log(`${color.dim('Assistant:')} ${reply}`);
    }

    const lastEvent = bus.getTimeline().at(-1);
    const durationMs = lastEvent?.metadata?.durationMs as number | undefined;
    console.log(color.green(`  (took ${durationMs ?? '?'}ms)\n`));
  }
  rl.close();
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 15 — Real-World Assistant (Capstone)

**Level 9 · Capstone · Advanced · ~15 min**

## What problem does this solve?
Nothing new — this is the "wow, I understand Aidex" moment, where every
concept from levels 1-8 is composed into one small interactive
assistant instead of demonstrated in isolation.

## Why would I use this Aidex feature?
This is a synthesis, not a new feature: provider selection (03), an
optional system prompt (03), a versioned prompt template (02), the
`AIBuilder`/`AI` façade (01), a real domain engine call (`document.
summarize`, from 07), and observability timing per turn (06) — all in
one file, looping until you type `exit`.

## When should I use this in a real project?
This is the shape a real Aidex-backed CLI assistant takes: pick a
provider once, loop on user input, route some requests through
specialized engines and the rest through plain `ai.text()`, and track
timing throughout.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode,
  same as 03-interactive-chat)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
GEMINI_API_KEY=your-key pnpm --filter @aidex/examples real-world-assistant
```
Type `summarize` to paste text through `document.summarize`, anything
else to chat, or `exit` to quit.

## Expected output
```
Optional system prompt (press Enter for a sensible default):
Commands: type a request, 'summarize' to paste text to summarize, or 'exit' to quit.

You: what's a clean way to debounce a function in TypeScript?
Assistant: ...
  (took 42ms)

You: exit
Goodbye!
```

## Concepts learned
- Nothing new by design — recognizing every piece from levels 1-8, composed
- How a real Aidex-backed assistant CLI is actually structured end to end

## Related packages
`@aidex/sdk`, `@aidex/providers`, `@aidex/prompts`, `@aidex/document`, `@aidex/observability`

## Next example
None — you've completed the course. See the master
[examples/README.md](../../README.md) for what to explore next
(`@aidex/content`, `@aidex/media`, `@aidex/cli`), or
[BUILD-YOUR-FIRST-AIDEX-APP.md](../../BUILD-YOUR-FIRST-AIDEX-APP.md) to
build your own project from scratch.
```

- [ ] **Step 3: Build; smoke-test non-interactively**

Run: `pnpm --filter @aidex/examples build`
Then: `printf "\nhello\nexit\n" | node examples/dist/15-real-world-assistant/index.js`
Expected: exits 0, demo-mode notice, skips provider-choice prompt (no key set), accepts default system prompt, processes "hello" via `ai.text()`, prints a duration line, exits cleanly on "exit".

- [ ] **Step 4: Commit**

```bash
git add examples/src/15-real-world-assistant
git commit -m "feat(examples): add 15-real-world-assistant capstone"
```

---

## Task 17: `BUILD-YOUR-FIRST-AIDEX-APP.md` tutorial

**Files:**
- Create: `examples/BUILD-YOUR-FIRST-AIDEX-APP.md`

**Interfaces:**
- Consumes: nothing programmatically — prose only, cross-links into examples 01 and 14 and the master README (produced in Task 18).

- [ ] **Step 1: Write the tutorial**

```markdown
# Build Your First Aidex App

**5-10 minute read.** By the end, you'll have a tiny working
TypeScript app that sends a prompt to a real (or demo) provider and
runs your own custom engine — copy the code blocks below into a
scratch file as you go.

This is a guided walkthrough, not a runnable example project like the
15 numbered examples in this folder — there's no `pnpm run` command
tied to it. If you'd rather see finished, runnable code first, start
with [01 — Getting Started](src/01-getting-started/README.md) instead.

## 1. Install

```bash
mkdir my-aidex-app && cd my-aidex-app
npm init -y
npm install @aidex/sdk @aidex/providers @aidex/engines typescript --save
npx tsc --init --target ES2022 --module NodeNext --moduleResolution NodeNext
```

## 2. Configure a provider

Create `index.ts`:

```typescript
import { GeminiProvider, StubProvider } from '@aidex/providers';

const apiKey = process.env.GEMINI_API_KEY;
const provider = apiKey ? new GeminiProvider({ apiKey }) : new StubProvider();
```

`StubProvider` is a real, deterministic `Provider` implementation — not
a test mock — so this line of code works with zero setup, and upgrades
itself the moment you export a real `GEMINI_API_KEY`.

## 3. Create an `AIBuilder`

```typescript
import { AIBuilder } from '@aidex/sdk';

const ai = new AIBuilder().provider(provider).build();
```

This is the one line every Aidex program starts with: pick a provider,
build an `AI` instance.

## 4. Send your first prompt

```typescript
async function main() {
  const response = await ai.text('Give me a one-sentence pitch for a todo app.');
  console.log(response);
}
```

`ai.text(input)` is single-shot — no conversation memory. If you want a
chat loop, see [03 — Interactive Chat](src/03-interactive-chat/README.md)
for the pattern of managing that state yourself.

## 5. Register an engine

Not every Aidex call needs to hit an LLM. Here's a fully deterministic
custom engine:

```typescript
import type { Engine } from '@aidex/engines';

interface SlugInput { title: string }

const slugEngine: Engine<string> = {
  id: 'text.slugify',
  name: 'Slugify',
  description: 'Converts a title into a URL-safe slug',
  version: '1.0.0',
  async execute(context) {
    const { title } = context.request?.input as SlugInput;
    return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  },
};

const aiWithEngine = new AIBuilder().provider(provider).engine(slugEngine).build();
```

## 6. Execute it

```typescript
async function main() {
  const slug = await aiWithEngine.engine<string>('text.slugify').execute({ title: 'Hello Aidex World' });
  console.log(slug); // "hello-aidex-world"
}

main();
```

Run it with `npx tsc && node dist/index.js` (adjust paths to match your
`tsconfig.json`'s `outDir`).

## Next steps

You've now touched the two most important building blocks: providers
and engines. From here:

- [01 — Getting Started](src/01-getting-started/README.md) — the same
  provider-fallback pattern, as a full runnable example
- [14 — Custom Engine](src/14-custom-engine/README.md) — a deeper,
  more realistic custom engine
- [examples/README.md](README.md) — the full 9-level learning path,
  including document/design/marketing feature packages, workflows,
  plugins, and observability
```

- [ ] **Step 2: Verify code blocks are internally consistent**

Read back through the file and confirm every import/variable name used
in a later code block was actually introduced in an earlier one (e.g.
`provider`, `ai`, `slugEngine`, `aiWithEngine` — no undefined
references). No build step applies to this file since it's prose, not
a package — this is a manual read-through check.

- [ ] **Step 3: Commit**

```bash
git add examples/BUILD-YOUR-FIRST-AIDEX-APP.md
git commit -m "docs(examples): add Build Your First Aidex App tutorial"
```

---

## Task 18: Master `examples/README.md`

**Files:**
- Modify: `examples/README.md`

**Interfaces:**
- Consumes: nothing programmatically — cross-links to every example's README (Tasks 2-16) and the tutorial (Task 17), so this task must run after all of those.

- [ ] **Step 1: Read the current `examples/README.md`** to confirm nothing worth preserving is lost (the old "Design notes"/"Limitations discovered" sections describe the pre-façade state and should not carry forward as-is — this task replaces them with content reflecting the current, verified SDK surface).

- [ ] **Step 2: Rewrite `examples/README.md`**

```markdown
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
```

- [ ] **Step 3: Verify every link resolves**

Run: `grep -oE '\[[^]]+\]\(([^)]+)\)' examples/README.md | grep -oE '\(([^)]+)\)' | tr -d '()'` then for each relative path, confirm the file exists (`ls examples/<path>`).
Expected: every linked path (`src/NN-*/README.md`, `BUILD-YOUR-FIRST-AIDEX-APP.md`) exists on disk — no 404s.

- [ ] **Step 4: Commit**

```bash
git add examples/README.md
git commit -m "docs(examples): rewrite master README as a learning-path portal"
```

---

## Task 19: Full validation + newcomer-perspective final review

**Files:**
- Modify: any example file found to fail the checks below (no new files expected; this task fixes issues, it doesn't add features)

**Interfaces:**
- Consumes: all outputs of Tasks 1-18.

- [ ] **Step 1: Full build and typecheck (from a genuinely clean `dist/`)**

Run: `rm -rf examples/dist examples/tsconfig.tsbuildinfo && pnpm --filter @aidex/examples build`
Expected: exits 0, no TypeScript errors. Starting from a deleted `dist/` matters here — a stale `dist/` from an earlier partial/interrupted run can mask a real bug (e.g. leftover fixture files from a previous attempt making a fixture-reading example appear to work when a genuinely clean build wouldn't have produced those files). Confirm every example under `examples/src/*/fixtures/` has a matching `examples/dist/*/fixtures/` after this build (`copy-fixtures.js`, added in Task 1, is what produces these).

Run: `pnpm --filter @aidex/examples typecheck`
Expected: exits 0.

- [ ] **Step 2: Run every example once in demo mode (no `GEMINI_API_KEY`)**

```bash
unset GEMINI_API_KEY
node examples/dist/01-getting-started/index.js
node examples/dist/02-prompt-templates/index.js
printf "hi\nexit\n" | node examples/dist/03-interactive-chat/index.js
node examples/dist/04-custom-provider/index.js
node examples/dist/05-provider-comparison/index.js
node examples/dist/06-observability/index.js
printf "5\n1\n" | node examples/dist/07-document-intelligence/index.js
node examples/dist/08-resume-analyzer/index.js
printf "\n" | node examples/dist/09-brand-kit-generator/index.js
printf "\n" | node examples/dist/10-marketing-campaign/index.js
node examples/dist/11-workflow-orchestration/index.js
node examples/dist/12-plugin-example/index.js
node examples/dist/13-tool-registry/index.js
node examples/dist/14-custom-engine/index.js
printf "\nhello\nexit\n" | node examples/dist/15-real-world-assistant/index.js
```
Expected: every command exits 0 (check `echo $?` after each, or run under `set -e`), no uncaught exceptions, no hangs.

- [ ] **Step 3: Confirm no cross-example or unpublished-path imports**

Run: `grep -rn "from '\.\./\.\./" examples/src` and `grep -rn "from '.*dist/" examples/src` and `grep -rn "from '.*packages/[a-z-]*/src" examples/src`
Expected: no matches — every import is either a relative path within its own example folder or a bare `@aidex/*` package specifier.

- [ ] **Step 4: Confirm no new runtime dependencies were introduced**

Run: `git diff main -- examples/package.json` (or `git show HEAD -- examples/package.json` if already committed) and inspect the `dependencies`/`devDependencies` blocks.
Expected: only the `@aidex/*` workspace packages listed in Task 1, Step 3 — nothing else added.

- [ ] **Step 5: Newcomer-perspective final review**

Read through all 15 example READMEs plus the master README and the
tutorial doc, in order, as if seeing Aidex for the first time. For each
of the following, note any example that fails the bar and fix it
before considering this task done:

- Does each level build only on concepts already introduced by earlier
  levels — no unexplained jump (e.g. an example using a type or pattern
  never introduced before it)?
- Does every README's "Purpose" section explain a decision (why this
  approach, when to reach for it) rather than just restating what the
  API call does?
- After finishing example 15, would a newcomer understand *why* Aidex
  exists (composable providers/engines/workflows/plugins), not just
  what its function signatures are?
- Is the polish level comparable to onboarding docs from React/Vite/
  Prisma/Next.js/LangChain — clear objective, runnable immediately,
  honest about limitations, no example that reads like a bare API
  reference?

If any example fails this bar, rewrite the offending section(s) now —
this step is part of the task's definition of done, not optional
polish deferred to later.

- [ ] **Step 6: Commit any fixes from Step 5**

```bash
git add examples/
git commit -m "fix(examples): address findings from newcomer-perspective review"
```
(Skip this commit if Step 5 found nothing to change.)
```
