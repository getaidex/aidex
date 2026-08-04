# OSS Readiness Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the real, currently-outstanding issues from an OSS-readiness audit of the Aidex monorepo — publish safety, CommonJS documentation, version/changelog drift, per-package licensing, a release CI workflow, and 5 new examples for packages that currently have none.

**Architecture:** Six independent workstreams: (1) a hand-rolled pnpm-only guard script wired into `preinstall`/`prepublishOnly`, (2) a mechanical, scripted edit adding `engines.pnpm`, the guard, and a LICENSE file to all 22 published packages, (3) a new `release.yml` GitHub Actions workflow, (4) CommonJS usage docs in the root README and `packages/sdk/README.md`, (5) README/CHANGELOG/CONTRIBUTING version-drift fixes, (6) 5 new bonus examples (`16`-`20`) for `@aidex/adapters`, `@aidex/memory`, `@aidex/mcp`, `@aidex/mcp-aidex`, `@aidex/cli`, following the same conventions as the existing 15-example course.

**Tech Stack:** TypeScript, pnpm workspace, Node.js built-ins only (no new npm dependencies), GitHub Actions.

## Global Constraints

- No new npm runtime/dev dependencies anywhere in the repo — the pnpm guard is hand-rolled (matches how the examples course avoided `chalk`/`inquirer`/etc.).
- Every one of the 22 published packages currently has byte-identical metadata shape (name, version, description, license, author, homepage, repository, bugs, keywords, sideEffects, engines, publishConfig) — any mechanical edit must preserve that consistency, not special-case individual packages.
- The 5 new examples follow the existing course's conventions exactly: `examples/src/<NN-name>/index.ts` + `README.md`, demo-mode fallback (`GEMINI_API_KEY` check → real provider, else a deterministic stand-in with a visible notice) wherever a `Provider` is involved, build via `tsc -b`, run via plain `node`, no `ts-node`/`tsx`, no cross-example imports, README follows the "what problem / why / when / what's next" 8-section template established in the existing 15.
- Do not modify `packages/*` source code (`src/`) — only each package's `package.json` (adding fields) and adding a `LICENSE` file. No public API, kernel, or engine/strategy logic changes anywhere.
- Verified, real API signatures to use (do not invent alternatives — confirmed by reading actual source in `packages/adapters`, `packages/memory`, `packages/mcp`, `packages/mcp-aidex`, `packages/cli`):
  - `@aidex/adapters`: `class ExpressAdapter { constructor(ai: AI); async handleRequest(request: {prompt: string}): Promise<{result: string}> }`, `class NodeAdapter { constructor(ai: AI); async executeText(prompt: string): Promise<string> }` (delegates to `ai.text(prompt)`; rejects empty input).
  - `@aidex/memory`: `class Memory<TValue> { set(key, value); get(key): TValue|undefined; has(key); delete(key); clear(); }`, `class MemoryStore<TValue> { readonly name: string; constructor(name: string, memory?: Memory<TValue>); getMemory(): Memory<TValue>; }`. Zero dependencies, no persistence — two `MemoryStore`s with different names never share state, and nothing survives a process restart.
  - `@aidex/mcp`: `class MCPServer { readonly tools: MCPToolRegistry; readonly resources: MCPResourceRegistry; readonly prompts: MCPPromptRegistry; constructor(config: {name, version, description?, transport, logger?}); getMetadata(); isStarted(); async start(): Promise<void>; async stop(): Promise<void>; }`. `MCPServer.start()` wires `transport.start(handler, errorHandler)` to an internal `MCPProtocolHandler`, dispatching JSON-RPC 2.0 methods `initialize`, `tools/list`, `tools/call` (params `{name, arguments}`), `resources/list`, `resources/read` (params `{uri}`), `prompts/list`, `prompts/get` — confirmed by reading `MCPProtocolHandler.ts` directly. `class StdioTransport { constructor(config?: {input?: Readable, output?: Writable}); start(onMessage, onError?): void; send(message): void; close(): void; }` — reads newline-delimited JSON from `input`, writes newline-delimited JSON to `output`; defaults to `process.stdin`/`process.stdout` but accepts any `Readable`/`Writable` (e.g. `node:stream`'s `PassThrough`) — confirmed via its own test suite using `PassThrough`. `MCPToolRegistry.register(tool: {name, description?, inputSchema?, execute(input): Promise<{content: {type:'text', text:string}[], isError?: boolean}>}): void`. `MCPResourceRegistry.register(resource: {uri, name, description?, mimeType?, read(): Promise<{uri, mimeType?, text?}>}): void`.
  - `@aidex/mcp-aidex`: `class EngineRegistryToMCPAdapter { constructor(config: {engineRegistry: EngineRegistry, mcpServer: MCPServer, context: ExecutionContext}); registerAll(): void; unregisterAll(): void; listRegisteredEngines(): Engine[]; }` — bulk-exposes every `Engine` in an `EngineRegistry` as a real MCP tool (name ← `engine.id`), idempotent. Depends on `@aidex/mcp` (never the reverse).
  - `@aidex/cli`: `class CLI { constructor(ai: AI, version: string); register(command: {name: string, execute(ai: AI, input: string): Promise<string>}): void; async execute(name: string, input?: string): Promise<string>; }` — auto-registers `"text"`/`"version"` at construction. **`Command` and `CommandNotFoundError` are NOT re-exported from the package barrel** (`packages/cli/src/index.ts` only exports `{ CLI }`) — register custom commands as plain object literals (structural typing, no import needed), and catch unknown-command errors generically via `(error as Error).message` (confirmed format: `Unknown command: "<name>"`), never `instanceof CommandNotFoundError`.
  - `EngineRegistry` (`@aidex/engines`): also has `.list(): Engine[]` (confirmed — `EngineRegistryToMCPAdapter.registerAll()` calls it), in addition to `.register(engine)` and `.execute(id, context)` already used in examples 07/08/09/10/11/14.

---

## Task 1: Publish-safety guard script

**Files:**
- Create: `scripts/assert-pnpm.cjs`
- Create: `.npmrc`
- Modify: `package.json` (root)

**Interfaces:**
- Produces: the `scripts/assert-pnpm.cjs` script that Task 2 wires into every package's `prepublishOnly`.

- [ ] **Step 1: Create the guard script**

```javascript
#!/usr/bin/env node
'use strict';

// This monorepo uses pnpm's `workspace:*` protocol for every internal
// @aidex/* dependency. npm and yarn don't understand that protocol — they
// either fail outright or (worse, for `npm publish`/`npm pack`) ship the
// literal, unresolved string "workspace:*" into the published tarball. Only
// pnpm rewrites it to the real resolved version at publish time. This guard
// fails loudly before either of those things can happen silently.
const userAgent = process.env.npm_config_user_agent || '';

if (!userAgent.includes('pnpm')) {
  console.error(
    [
      '',
      'This repository is pnpm-only.',
      `You ran this with: ${userAgent || 'an unknown package manager'}`,
      '',
      'Use `pnpm install` (not npm/yarn) to install dependencies, and',
      '`pnpm publish` / `pnpm -r publish` (not `npm publish`) to publish —',
      'npm/yarn do not rewrite this monorepo\'s internal "workspace:*"',
      'dependency ranges, so anything installed or published with them',
      'will be broken.',
      '',
    ].join('\n')
  );
  process.exit(1);
}
```

- [ ] **Step 2: Create `.npmrc`**

```ini
engine-strict=true
```

- [ ] **Step 3: Wire the guard into root `package.json`**

Read the current file first, then add a `"preinstall"` script (preserving every existing script) and a `pnpm` entry under `"engines"`:

```json
{
  "scripts": {
    "preinstall": "node scripts/assert-pnpm.cjs",
    "build": "pnpm -r run build",
    "clean": "tsc -b --clean",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "lint": "eslint packages/*/src apps/*/src examples/src"
  },
  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  }
}
```

- [ ] **Step 4: Verify the guard fires correctly**

Run: `npm_config_user_agent="npm/10.0.0 node/v22.0.0" node scripts/assert-pnpm.cjs; echo "exit: $?"`
Expected: prints the pnpm-only error message, `exit: 1`.

Run: `npm_config_user_agent="pnpm/10.0.0 node/v22.0.0" node scripts/assert-pnpm.cjs; echo "exit: $?"`
Expected: no output, `exit: 0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/assert-pnpm.cjs .npmrc package.json
git commit -m "chore: add pnpm-only publish/install guard"
```

---

## Task 2: Apply `engines.pnpm` + `prepublishOnly` guard + LICENSE to all 22 packages

**Files:**
- Modify: `packages/*/package.json` (all 22)
- Create: `packages/*/LICENSE` (all 22, identical copy of root `LICENSE`)

**Interfaces:**
- Consumes: `scripts/assert-pnpm.cjs` from Task 1 (referenced via relative path `../../scripts/assert-pnpm.cjs` from each `packages/<name>/` directory).

- [ ] **Step 1: Write and run a one-off mechanical edit script**

This script is temporary — write it to `/tmp/apply-oss-fixes.mjs` (outside the repo, so there's no risk of accidentally committing it), run it once, then delete it. It does NOT touch `src/`, only each package's `package.json` and adds a `LICENSE` file.

```javascript
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.argv[2];
if (!repoRoot) {
  console.error('Usage: node apply-oss-fixes.mjs <repo-root>');
  process.exit(1);
}

const rootLicense = fs.readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8');
const packagesDir = path.join(repoRoot, 'packages');
const packageNames = fs
  .readdirSync(packagesDir)
  .filter((name) => fs.statSync(path.join(packagesDir, name)).isDirectory());

for (const name of packageNames) {
  const pkgDir = path.join(packagesDir, name);
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  pkg.engines = { ...pkg.engines, pnpm: '>=9' };

  pkg.scripts = { ...pkg.scripts, prepublishOnly: 'node ../../scripts/assert-pnpm.cjs' };

  if (!pkg.files.includes('LICENSE')) {
    pkg.files = [...pkg.files, 'LICENSE'];
  }

  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(path.join(pkgDir, 'LICENSE'), rootLicense);

  console.log(`updated ${name}`);
}

console.log(`\nDone: ${packageNames.length} packages updated.`);
```

Run: `node /tmp/apply-oss-fixes.mjs /Users/sudheerbabu/aidex` (adjust the repo-root path to wherever this worktree actually is)
Expected: prints `updated <name>` for all 22 packages, then `Done: 22 packages updated.`

- [ ] **Step 2: Delete the one-off script**

Run: `rm /tmp/apply-oss-fixes.mjs`

- [ ] **Step 3: Verify the edits are correct and consistent**

Run: `git diff --stat packages/` — expect exactly 22 modified `package.json` files and 22 new `LICENSE` files, nothing else.

Run: `for f in packages/*/package.json; do node -e "const p=require('./$f'); if(!p.engines.pnpm || !p.scripts.prepublishOnly || !p.files.includes('LICENSE')) { console.error('MISSING in $f'); process.exit(1); }"; done; echo done`
Expected: no `MISSING` lines, prints `done`.

Run: `diff packages/sdk/LICENSE LICENSE && diff packages/core/LICENSE LICENSE && echo "license copies match root"`
Expected: no diff output, prints the confirmation line.

- [ ] **Step 4: Confirm the whole repo still builds and typechecks after this mechanical edit**

Run: `pnpm install && pnpm typecheck && pnpm build`
Expected: all exit 0 — this edit only touches metadata, never `src/`, so nothing should break.

- [ ] **Step 5: Commit**

```bash
git add packages/
git commit -m "chore: add prepublishOnly pnpm guard, pnpm engine constraint, and per-package LICENSE to all 22 packages"
```

---

## Task 3: Release CI workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- None — this is a standalone CI workflow file, no code dependencies.

- [ ] **Step 1: Write the workflow**

```yaml
name: Release

on:
  pull_request:
  push:
    tags:
      - 'v*'

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  publish-dry-run:
    if: github.event_name == 'pull_request'
    name: Publish dry-run (PR safety check)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Dry-run publish every package
        run: pnpm -r publish --dry-run --no-git-checks

  publish:
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
    name: Publish to npm
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Test
        run: pnpm test

      - name: Publish every package
        run: pnpm -r publish --no-git-checks
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Note in the PR/commit description: the `publish` job requires an `NPM_TOKEN` repository secret to be configured by a repo admin before the first tag push — this plan cannot create that secret, only the workflow that consumes it.

- [ ] **Step 2: Validate the YAML**

Run: `node -e "require('node:child_process').execSync('npx --yes js-yaml .github/workflows/release.yml', {stdio:'inherit'})"` — if `js-yaml` isn't available offline, instead validate with: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml')); print('valid yaml')"`
Expected: `valid yaml` (or equivalent successful parse), no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow with PR dry-run publish check and tag-triggered publish"
```

---

## Task 4: CommonJS documentation

**Files:**
- Modify: `README.md` (root)
- Modify: `packages/sdk/README.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Add a CommonJS variant to the root Quick Start**

Find the existing Quick Start section in `README.md` (the fenced ` ```ts ` block starting `import { AIBuilder } from '@aidex/sdk';`) and add a CommonJS variant immediately after it, before the explanatory paragraph that follows:

```markdown
## Quick Start

```ts
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider } from '@aidex/providers';

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }))
  .build();

const result = await ai.text('Say hello to Aidex in one short sentence.');
console.log(result);
```

Every `@aidex/*` package ships a CommonJS build too — the same example with `require`:

```js
const { AIBuilder } = require('@aidex/sdk');
const { GeminiProvider } = require('@aidex/providers');

const ai = new AIBuilder()
  .provider(new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }))
  .build();

ai.text('Say hello to Aidex in one short sentence.').then(console.log);
```

That's the entire public surface most applications ever touch:
```

(Keep everything after that line — the existing explanatory paragraph — unchanged.)

- [ ] **Step 2: Add the same CJS variant to `packages/sdk/README.md`**

Find the `## Installation` section's existing ESM usage (if any code sample follows it directly) or the first code sample in the file, and add a matching `require()` variant using the same pattern as Step 1, sized appropriately to that README's existing structure (read the file first to place it naturally — likely right after its own Quick-Start-equivalent code block).

- [ ] **Step 3: Verify both snippets are runnable**

Run (in a scratch directory, against the local workspace via `pnpm link` or by copying the pattern into a `.cjs` file inside the repo temporarily and running with `node`): confirm `require('@aidex/sdk')` and `require('@aidex/providers')` resolve to the CJS build's exports (`AIBuilder`, `GeminiProvider`) — e.g. `node -e "const {AIBuilder} = require('./packages/sdk/dist/index.cjs'); console.log(typeof AIBuilder)"` should print `function`. Do this for both packages referenced in the snippet.

- [ ] **Step 4: Commit**

```bash
git add README.md packages/sdk/README.md
git commit -m "docs: add CommonJS usage examples alongside existing ESM ones"
```

---

## Task 5: Version/CHANGELOG sync + CONTRIBUTING.md publish section

**Files:**
- Modify: `README.md` (root, §Status)
- Modify: `CHANGELOG.md`
- Modify: `CONTRIBUTING.md`

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Bump README §Status to the real current version**

Find the `## Status` section (currently reads `` `0.2.0-alpha`, published to npm... ``) and update the version number and CHANGELOG reference:

```markdown
## Status

`0.2.1-alpha`, published to npm under the `@aidex` scope. The
kernel (`@aidex/core`) is frozen and stable: public API, lifecycle, and type
contracts are implemented and tested. Every other package listed below is
real, tested, working code — not a roadmap item — but the platform as a
whole is still pre-1.0 and its APIs may change. See
[`docs/roadmap/roadmap.md`](docs/roadmap/roadmap.md) for what's next and
[`CHANGELOG.md`](CHANGELOG.md) for what shipped in `0.2.1-alpha`.
```

- [ ] **Step 2: Add the missing `0.2.1-alpha` CHANGELOG entry**

Read the current `CHANGELOG.md` first. Insert a new section between `## [Unreleased]` and `## [0.2.0-alpha] - 2026-08-03`:

```markdown
## [0.2.1-alpha] - 2026-08-04

### Changed

- Synchronized every package's version number — root `package.json` had
  drifted to `0.2.1-alpha` while all 22 published packages remained at
  `0.2.0-alpha`. This repo uses fixed/lockstep versioning; all 24
  `package.json` files (22 packages + 2 private apps) now match.
- Rewrote the root README's `## Status` and `## Installation` sections,
  which previously told visitors the project wasn't published to npm and
  pointed them at `git clone` + `file:` dependencies — both false as of
  `0.2.0-alpha`'s actual publish.
- Reworded `@aidex/cli`'s `package.json` description off "the first
  executable application" (it has no `bin` field — it's a
  command-dispatch class, not a terminal executable).
- Replaced the entire `examples/` folder: 8 API-demonstration scripts
  became a 15-example, 9-level learning-path course (Getting Started →
  Providers → Documents → Design → Marketing → Workflow → Plugins →
  Custom Engines → Capstone), plus a `BUILD-YOUR-FIRST-AIDEX-APP.md`
  tutorial and a rewritten `examples/README.md` portal. Every example
  runs with zero setup, falling back to a deterministic demo provider
  without a `GEMINI_API_KEY`.
- Added 5 more examples (`16`-`20`) covering the previously-uncovered
  `@aidex/adapters`, `@aidex/memory`, `@aidex/mcp`, `@aidex/mcp-aidex`,
  and `@aidex/cli` packages.

### Added

- A pnpm-only publish/install guard (`scripts/assert-pnpm.cjs`, wired
  into root `preinstall` and every package's `prepublishOnly`) — plain
  `npm publish`/`npm pack` previously shipped the literal, unresolved
  `"workspace:*"` string into published tarballs with no automated
  guard against it.
- A release CI workflow (`.github/workflows/release.yml`): a
  `pnpm -r publish --dry-run` check on every PR, and a real
  `pnpm -r publish` on `v*` tag pushes.
- A `LICENSE` file in every one of the 22 published packages (only the
  root `LICENSE` existed before — a standalone unpacked install shipped
  with no license text).
- CommonJS (`require()`) usage examples in the root README and
  `packages/sdk/README.md`, alongside the existing ESM ones — the dual
  ESM/CJS build support shipped in `0.2.0-alpha` had no corresponding
  CJS documentation until now.

## [0.2.0-alpha] - 2026-08-03
```

- [ ] **Step 3: Add a "Publishing" section to CONTRIBUTING.md**

Read the current file first, then add a new section (after the existing "Setup" section, before "Project structure" — or wherever reads most naturally given the file's actual structure):

```markdown
## Publishing

This repository publishes exclusively via `pnpm`:

```bash
pnpm build
pnpm -r publish --dry-run   # sanity check first — safe, changes nothing
pnpm -r publish             # the real thing
```

Never use `npm publish` or `npm pack` on an individual package. Every
internal `@aidex/*` dependency uses pnpm's `workspace:*` protocol, which
only `pnpm publish` rewrites to the real resolved version at publish time —
`npm`/`yarn` ship that string literally, producing a broken package. A
`prepublishOnly` guard (`scripts/assert-pnpm.cjs`) fails loudly if this is
ever attempted with the wrong tool, but `pnpm -r publish --dry-run` is the
right way to catch problems before they matter.
```

- [ ] **Step 4: Verify no other stale version references were missed**

Run: `grep -rn "0\.2\.0-alpha" README.md CONTRIBUTING.md docs/ 2>/dev/null | grep -v CHANGELOG.md`
Expected: only legitimate historical references (e.g. inside the CHANGELOG's own `0.2.0-alpha` section, or roadmap text describing what shipped *in* that release) — no lingering "current version" claims. Fix any found.

- [ ] **Step 5: Commit**

```bash
git add README.md CHANGELOG.md CONTRIBUTING.md
git commit -m "docs: sync README/CHANGELOG to 0.2.1-alpha, add publishing guidance to CONTRIBUTING"
```

---

## Task 6: Wire the 5 new example packages into the build

**Files:**
- Modify: `examples/tsconfig.json`
- Modify: `examples/package.json`

**Interfaces:**
- Produces: the `pnpm --filter @aidex/examples <script>` entrypoints and TS project references Tasks 7-11 need.

- [ ] **Step 1: Add 5 project references to `examples/tsconfig.json`**

Read the current file first, then add these 5 entries to the existing `references` array (alongside the 13 already there):

```json
    { "path": "../packages/adapters" },
    { "path": "../packages/memory" },
    { "path": "../packages/mcp" },
    { "path": "../packages/mcp-aidex" },
    { "path": "../packages/cli" }
```

- [ ] **Step 2: Add 5 scripts and 5 dependencies to `examples/package.json`**

Read the current file first, then add these entries to `scripts` (after the existing `real-world-assistant` entry) and `dependencies` (alongside the existing 13):

```json
    "framework-adapters": "node dist/16-framework-adapters/index.js",
    "memory-store": "node dist/17-memory-store/index.js",
    "mcp-server": "node dist/18-mcp-server/index.js",
    "mcp-engine-bridge": "node dist/19-mcp-engine-bridge/index.js",
    "build-a-cli": "node dist/20-build-a-cli/index.js"
```

```json
    "@aidex/adapters": "workspace:*",
    "@aidex/memory": "workspace:*",
    "@aidex/mcp": "workspace:*",
    "@aidex/mcp-aidex": "workspace:*",
    "@aidex/cli": "workspace:*"
```

- [ ] **Step 3: Verify the scaffold is coherent**

Run: `pnpm install`
Expected: exits 0, resolves the 5 new workspace deps with no errors.

- [ ] **Step 4: Commit**

```bash
git add examples/tsconfig.json examples/package.json
git commit -m "chore(examples): wire in 5 new example packages (adapters, memory, mcp, mcp-aidex, cli)"
```

---

## Task 7: `16-framework-adapters`

**Files:**
- Create: `examples/src/16-framework-adapters/index.ts`
- Create: `examples/src/16-framework-adapters/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`, `StubProvider` from `@aidex/providers`; `ExpressAdapter`, `NodeAdapter` from `@aidex/adapters`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 16 — Framework Adapters (Bonus)
 *
 * @aidex/adapters does no AI logic of its own — it's a thin translation
 * layer between a framework's call shape and one shared AI instance's
 * ai.text(). This example builds one AI, wraps it in both adapters, and
 * shows they both delegate to the exact same underlying call.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { ExpressAdapter, NodeAdapter } from '@aidex/adapters';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();
  const prompt = 'Suggest a name for a note-taking app.';

  // NodeAdapter: the shape a plain script or function call site wants —
  // just a string in, a string out.
  const nodeAdapter = new NodeAdapter(ai);
  const nodeResult = await nodeAdapter.executeText(prompt);
  console.log('NodeAdapter result:', nodeResult);

  // ExpressAdapter: the shape an Express route handler wants — a
  // {prompt} request object in, a {result} response object out. This
  // example never imports express itself; the adapter's contract is
  // just those two plain object shapes.
  const expressAdapter = new ExpressAdapter(ai);
  const expressResponse = await expressAdapter.handleRequest({ prompt });
  console.log('ExpressAdapter result:', expressResponse.result);

  console.log(
    '\nBoth adapters delegate to the same ai.text() call underneath —',
    nodeResult === expressResponse.result ? 'identical output, as expected.' : 'output differs (only possible with a live, non-deterministic provider).'
  );

  // Adapters validate input the same way ai.text() itself would.
  try {
    await nodeAdapter.executeText('');
  } catch (error) {
    console.log('\nEmpty input correctly rejected:', (error as Error).message);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 16 — Framework Adapters (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You have one `AI` instance and want to expose it through more than one
call shape — a plain function call site, and an Express-style
`{prompt}` → `{result}` request handler — without duplicating the
provider setup or prompt logic in each place.

## Why would I use this Aidex feature?
`@aidex/adapters` is a pure translation layer: `NodeAdapter` and
`ExpressAdapter` both wrap the exact same `AI` instance and both
delegate to `ai.text()` — they contain no AI logic of their own. One
`AI`, many entry points.

## When should I use this in a real project?
Any time the same underlying AI call needs to be reachable from more
than one integration surface — a CLI script and an HTTP route, for
instance — without re-deriving provider/prompt setup in each.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples framework-adapters
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

NodeAdapter result: stub:Suggest a name for a note-taking app.
ExpressAdapter result: stub:Suggest a name for a note-taking app.

Both adapters delegate to the same ai.text() call underneath — identical output, as expected.

Empty input correctly rejected: ...
```

## Concepts learned
- `@aidex/adapters`' two adapter classes and their exact request/response shapes
- Why a framework adapter should contain zero AI logic of its own
- Shared input validation across adapters wrapping the same `AI`

## Related packages
`@aidex/adapters`, `@aidex/sdk`, `@aidex/providers`

## Next example
[17 — Memory Store](../17-memory-store/README.md) — a fully standalone,
Provider-free package: a generic key/value primitive.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples framework-adapters`
Expected: exits 0, prints both adapter results (identical in demo mode), then the empty-input rejection message.

- [ ] **Step 4: Commit**

```bash
git add examples/src/16-framework-adapters
git commit -m "feat(examples): add 16-framework-adapters"
```

---

## Task 8: `17-memory-store`

**Files:**
- Create: `examples/src/17-memory-store/index.ts`
- Create: `examples/src/17-memory-store/README.md`

**Interfaces:**
- Consumes: `MemoryStore` from `@aidex/memory`; `AIBuilder` from `@aidex/sdk`; `GeminiProvider`, `StubProvider` from `@aidex/providers`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 17 — Memory Store (Bonus)
 *
 * @aidex/memory is NOT a chat-history or vector store — it's a generic,
 * synchronous, in-process key/value primitive, backed by a plain Map.
 * This example uses two independently-named MemoryStores to cache
 * values across a sequence of calls, and demonstrates that stores with
 * different names never share state, and that nothing here persists
 * across a fresh process — no serialization exists, a deliberate scope
 * boundary, not a gap.
 */
import { MemoryStore } from '@aidex/memory';
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();

  const conversationCache = new MemoryStore<string>('conversation-summaries');
  const statsCache = new MemoryStore<number>('turn-counts');

  const turns = ['What is TypeScript?', 'Give me one use case for generics.'];

  for (const [index, turn] of turns.entries()) {
    const summary = await ai.text(turn);
    conversationCache.getMemory().set(`turn-${index}`, summary);
    const previousCount = statsCache.getMemory().get('count') ?? 0;
    statsCache.getMemory().set('count', previousCount + 1);
  }

  console.log('Cached summaries:');
  for (const index of turns.keys()) {
    console.log(`  turn-${index}:`, conversationCache.getMemory().get(`turn-${index}`));
  }
  console.log('Total turns cached:', statsCache.getMemory().get('count'));

  // A differently-named store never sees this data — MemoryStores are
  // isolated by name, not by any shared global state.
  const isolatedStore = new MemoryStore<string>('conversation-summaries-2');
  console.log(
    '\nA differently-named store never sees this data:',
    isolatedStore.getMemory().get('turn-0') === undefined ? 'confirmed empty.' : 'unexpected leak!'
  );

  console.log(
    '\nNote: nothing here is written to disk — restart this process and both stores start empty again.'
  );
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 17 — Memory Store (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You need a simple key/value cache inside a single process run — caching
a computed summary, a running count, anything you don't want to
recompute mid-run — without reaching for a database or a vector store.

## Why would I use this Aidex feature?
`@aidex/memory`'s `MemoryStore` is a generic, synchronous, in-process
KV primitive. It is deliberately **not** chat memory and **not** a
vector store — no persistence, no expiration, no serialization. Two
stores are isolated purely by the name you give them.

## When should I use this in a real project?
Any short-lived, single-process caching need where you want a typed,
named store instead of a bare module-level `Map` scattered through
your code. Reach for a real persistence layer (a database, Redis, a
vector store) the moment you need data to survive a restart or be
shared across processes — this package explicitly doesn't do that.

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples memory-store
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

Cached summaries:
  turn-0: stub:What is TypeScript?
  turn-1: stub:Give me one use case for generics.
Total turns cached: 2

A differently-named store never sees this data: confirmed empty.

Note: nothing here is written to disk — restart this process and both stores start empty again.
```

## Concepts learned
- `MemoryStore<TValue>` + `Memory<TValue>`'s full API (`set`/`get`/`has`/`delete`/`clear`)
- Isolation by store name — no accidental cross-store sharing
- The deliberate absence of persistence — a scope boundary, not a bug

## Related packages
`@aidex/memory`, `@aidex/sdk`

## Next example
[18 — MCP Server](../18-mcp-server/README.md) — a real protocol server,
driven entirely in-process with no external client needed.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples memory-store`
Expected: exits 0, prints both cached summaries, total count `2`, and the isolation confirmation.

- [ ] **Step 4: Commit**

```bash
git add examples/src/17-memory-store
git commit -m "feat(examples): add 17-memory-store"
```

---

## Task 9: `18-mcp-server`

**Files:**
- Create: `examples/src/18-mcp-server/index.ts`
- Create: `examples/src/18-mcp-server/README.md`

**Interfaces:**
- Consumes: `MCPServer`, `StdioTransport` from `@aidex/mcp`; types `MCPTool`, `MCPResource` from `@aidex/mcp`; `PassThrough` from `node:stream`; `createInterface` from `node:readline`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 18 — MCP Server (Bonus)
 *
 * @aidex/mcp is a real, hand-rolled Model Context Protocol server
 * foundation — three registries (tools/resources/prompts), a JSON-RPC
 * 2.0 protocol handler, and one newline-delimited-JSON transport
 * (StdioTransport). No AI logic anywhere in this package. This example
 * drives a full request/response cycle in-process, using two
 * node:stream PassThrough pipes in place of a real stdin/stdout pipe —
 * the transport only knows it has a Readable to read from and a
 * Writable to write to, so a real `node server.js` piped to a real MCP
 * client would use this exact same StdioTransport unchanged. No
 * external MCP client, no network, no GEMINI_API_KEY needed.
 */
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { MCPServer, StdioTransport } from '@aidex/mcp';
import type { MCPTool, MCPResource } from '@aidex/mcp';

const echoTool: MCPTool<{ text: string }> = {
  name: 'echo',
  description: 'Echoes back whatever text you send it',
  inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  async execute(input) {
    return { content: [{ type: 'text', text: `You said: ${input.text}` }] };
  },
};

const readmeResource: MCPResource = {
  uri: 'aidex://readme',
  name: 'Aidex README excerpt',
  mimeType: 'text/plain',
  async read() {
    return {
      uri: 'aidex://readme',
      mimeType: 'text/plain',
      text: 'Aidex is a modular, provider-agnostic AI application platform.',
    };
  },
};

const clientToServer = new PassThrough();
const serverToClient = new PassThrough();

function sendRequest(id: number, method: string, params?: unknown): void {
  clientToServer.write(
    `${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) })}\n`
  );
}

async function main() {
  const server = new MCPServer({
    name: 'aidex-example-server',
    version: '1.0.0',
    transport: new StdioTransport({ input: clientToServer, output: serverToClient }),
  });

  server.tools.register(echoTool);
  server.resources.register(readmeResource);

  const responseLines = createInterface({ input: serverToClient });
  responseLines.on('line', (line) => console.log('Response:', line));

  await server.start();

  sendRequest(1, 'initialize');
  sendRequest(2, 'tools/list');
  sendRequest(3, 'tools/call', { name: 'echo', arguments: { text: 'hello from the client' } });
  sendRequest(4, 'resources/read', { uri: 'aidex://readme' });

  // Give the async message handlers a tick to run before shutting down —
  // StdioTransport processes each line as it's read, asynchronously.
  await new Promise((resolve) => setTimeout(resolve, 50));

  await server.stop();
  responseLines.close();
  console.log('\nServer stopped.');
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 18 — MCP Server (Bonus)

**Bonus · Package Coverage · Intermediate · ~10 min**

## What problem does this solve?
You want to expose tools/resources/prompts to an MCP-speaking client
(like an AI coding assistant) without hand-rolling JSON-RPC 2.0
envelope handling, method routing, or transport framing yourself.

## Why would I use this Aidex feature?
`@aidex/mcp` is a real MCP server foundation: register tools/resources
on `server.tools`/`server.resources`, call `server.start()`, and the
package's own `MCPProtocolHandler` handles `initialize`, `tools/list`,
`tools/call`, `resources/list`, `resources/read`, `prompts/list`,
`prompts/get` for you — you only ever implement `execute()`/`read()`
for the capabilities you register.

## When should I use this in a real project?
Building a real MCP server for a coding assistant, editor plugin, or
any other MCP client to connect to. This package defines the server
architecture — pair it with `@aidex/mcp-aidex` (next example) if you
want to expose existing Aidex `Engine`s as MCP tools automatically
rather than hand-writing each one.

## Requirements
- Node ≥18, pnpm — no API key needed, this example never calls a provider.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples mcp-server
```

## Expected output
```
Response: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"...","capabilities":{"tools":{},"resources":{},"prompts":{}},"serverInfo":{"name":"aidex-example-server","version":"1.0.0"}}}
Response: {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"echo","description":"Echoes back whatever text you send it","inputSchema":{...}}]}}
Response: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"You said: hello from the client"}]}}
Response: {"jsonrpc":"2.0","id":4,"result":{"contents":[{"uri":"aidex://readme","mimeType":"text/plain","text":"Aidex is a modular, provider-agnostic AI application platform."}]}}

Server stopped.
```
(Exact `protocolVersion` value depends on the installed `@aidex/mcp` version — verify against your actual run rather than hardcoding it.)

## Concepts learned
- `MCPServer` + `StdioTransport` wired together, driven via `PassThrough` pipes instead of real stdio
- The real JSON-RPC 2.0 method names this foundation dispatches (`initialize`, `tools/list`, `tools/call`, `resources/read`, ...)
- Registering both a tool and a resource on the same server

## Related packages
`@aidex/mcp`

## Next example
[19 — MCP Engine Bridge](../19-mcp-engine-bridge/README.md) — expose
existing Aidex `Engine`s as MCP tools automatically, instead of
hand-writing each tool's `execute()`.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples mcp-server`
Expected: exits 0, prints 4 `Response: {...}` JSON-RPC lines (ids 1-4) followed by `Server stopped.`. Compare the actual printed JSON against the README's Expected output and correct the README if the exact shape differs (e.g. field ordering, actual `protocolVersion` value) — verify by actually running it, don't assume.

- [ ] **Step 4: Commit**

```bash
git add examples/src/18-mcp-server
git commit -m "feat(examples): add 18-mcp-server"
```

---

## Task 10: `19-mcp-engine-bridge`

**Files:**
- Create: `examples/src/19-mcp-engine-bridge/index.ts`
- Create: `examples/src/19-mcp-engine-bridge/README.md`

**Interfaces:**
- Consumes: `EngineRegistry`, type `Engine` from `@aidex/engines`; `MCPServer`, `StdioTransport` from `@aidex/mcp`; `EngineRegistryToMCPAdapter` from `@aidex/mcp-aidex`; `StubProvider` from `@aidex/providers`; type `ExecutionContext` from `@aidex/core`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 19 — MCP Engine Bridge (Bonus)
 *
 * @aidex/mcp-aidex is the bridge between Aidex Engines and MCP Tools:
 * EngineRegistryToMCPAdapter bulk-exposes every Engine already sitting
 * in an EngineRegistry as a real, callable MCP tool on an MCPServer —
 * no manual per-engine wiring, and calling registerAll() again later
 * only picks up what's new. This reuses 18's server/transport pattern,
 * but drives a custom Engine (the same shape taught in 14-custom-engine)
 * through the full Engine -> MCPTool -> JSON-RPC pipeline.
 */
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import { EngineRegistry } from '@aidex/engines';
import type { Engine } from '@aidex/engines';
import { MCPServer, StdioTransport } from '@aidex/mcp';
import { EngineRegistryToMCPAdapter } from '@aidex/mcp-aidex';
import { StubProvider } from '@aidex/providers';
import type { ExecutionContext } from '@aidex/core';

const wordCountEngine: Engine<{ wordCount: number }> = {
  id: 'text.word-count',
  name: 'Word Count',
  description: 'Counts words in the given text',
  version: '1.0.0',
  async execute(context) {
    const input = context.request?.input as { text: string };
    return { wordCount: input.text.trim().split(/\s+/).filter(Boolean).length };
  },
};

const clientToServer = new PassThrough();
const serverToClient = new PassThrough();

function sendRequest(id: number, method: string, params?: unknown): void {
  clientToServer.write(
    `${JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined ? { params } : {}) })}\n`
  );
}

async function main() {
  const engineRegistry = new EngineRegistry();
  engineRegistry.register(wordCountEngine);

  // This engine never calls the provider, but ExecutionContext still
  // requires one — the same "every AI instance needs a Provider, not
  // every engine uses one" point 14-custom-engine makes.
  const provider = new StubProvider();
  const context: ExecutionContext = { config: { provider }, provider };

  const server = new MCPServer({
    name: 'aidex-engine-bridge-example',
    version: '1.0.0',
    transport: new StdioTransport({ input: clientToServer, output: serverToClient }),
  });

  const bridge = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer: server, context });
  bridge.registerAll();

  console.log(
    'Engines exposed as MCP tools:',
    bridge.listRegisteredEngines().map((engine) => engine.id)
  );

  const responseLines = createInterface({ input: serverToClient });
  responseLines.on('line', (line) => console.log('Response:', line));

  await server.start();

  sendRequest(1, 'tools/list');
  sendRequest(2, 'tools/call', {
    name: 'text.word-count',
    arguments: { text: 'Aidex bridges engines into MCP tools automatically.' },
  });

  await new Promise((resolve) => setTimeout(resolve, 50));

  await server.stop();
  responseLines.close();
  console.log('\nServer stopped.');
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 19 — MCP Engine Bridge (Bonus)

**Bonus · Package Coverage · Intermediate · ~10 min**

## What problem does this solve?
You already have Aidex `Engine`s (built-in feature-pack ones, or your
own custom ones from 14-custom-engine) and want to expose them to an
MCP client without hand-writing an `MCPTool` wrapper for each one.

## Why would I use this Aidex feature?
`EngineRegistryToMCPAdapter.registerAll()` bulk-converts every `Engine`
in an `EngineRegistry` into a real `MCPTool` on an `MCPServer` — the
tool's name is the engine's `id`, and calling it invokes the real
engine via the exact same `ExecutionContext` shape `ai.engine(id).execute()`
uses internally. It's idempotent: call it again after registering more
engines and only the new ones get added.

## When should I use this in a real project?
Any time you want an MCP client to be able to invoke your existing
Aidex engines directly — you write the engine once (see
14-custom-engine), and this package is the one place it becomes
reachable over MCP with no extra per-engine glue code.

## Requirements
- Node ≥18, pnpm — no API key needed; the demo engine is fully deterministic.

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples mcp-engine-bridge
```

## Expected output
```
Engines exposed as MCP tools: [ 'text.word-count' ]
Response: {"jsonrpc":"2.0","id":1,"result":{"tools":[{"name":"text.word-count","description":"Counts words in the given text"}]}}
Response: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"wordCount\":7}"}]}}

Server stopped.
```
(Verify the exact JSON against your actual run — field ordering isn't guaranteed.)

## Concepts learned
- `EngineRegistryToMCPAdapter` bulk-exposing an `EngineRegistry` as MCP tools
- The full Engine → MCPTool → JSON-RPC pipeline, end to end
- Why a `Provider` is still required even for an engine that never calls it

## Related packages
`@aidex/mcp-aidex`, `@aidex/mcp`, `@aidex/engines`, `@aidex/core`

## Next example
[20 — Build a CLI](../20-build-a-cli/README.md) — the last bonus
example: a tiny command-dispatch layer over one `AI` instance.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples mcp-engine-bridge`
Expected: exits 0, prints the registered-engines line, both `Response: {...}` lines (ids 1-2), then `Server stopped.`. Verify the actual JSON matches what's documented and correct the README if not.

- [ ] **Step 4: Commit**

```bash
git add examples/src/19-mcp-engine-bridge
git commit -m "feat(examples): add 19-mcp-engine-bridge"
```

---

## Task 11: `20-build-a-cli`

**Files:**
- Create: `examples/src/20-build-a-cli/index.ts`
- Create: `examples/src/20-build-a-cli/README.md`

**Interfaces:**
- Consumes: `AIBuilder` from `@aidex/sdk`; `GeminiProvider`, `StubProvider` from `@aidex/providers`; `CLI` from `@aidex/cli`.

- [ ] **Step 1: Write `index.ts`**

```typescript
/**
 * 20 — Build a CLI (Bonus)
 *
 * @aidex/cli's CLI class is a command-dispatch layer over one AI
 * instance — not a terminal executable (no bin field, no shebang; its
 * own package.json description says so explicitly). It auto-registers
 * "text" and "version" at construction. cli.register() takes any plain
 * object matching {name, execute(ai, input)} structurally — the
 * Command type itself isn't re-exported from the package on purpose,
 * so nothing here imports it; a plain object literal is enough.
 */
import { AIBuilder } from '@aidex/sdk';
import { GeminiProvider, StubProvider } from '@aidex/providers';
import { CLI } from '@aidex/cli';

function createProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiProvider({ apiKey });
  console.log('No GEMINI_API_KEY found — using StubProvider (demo mode).\n');
  return new StubProvider();
}

async function main() {
  const ai = new AIBuilder().provider(createProvider()).build();
  const cli = new CLI(ai, '0.2.1-alpha');

  // A custom command that needs the AI instance.
  cli.register({
    name: 'summarize',
    async execute(ai, input) {
      return ai.text(`Summarize in one sentence: ${input}`);
    },
  });

  // A custom command that needs no AI at all — proves a Command isn't
  // required to touch the AI instance it's handed.
  cli.register({
    name: 'uppercase',
    async execute(_ai, input) {
      return input.toUpperCase();
    },
  });

  const invocations: [string, string][] = [
    ['version', ''],
    ['text', 'Say hello to Aidex in one short sentence.'],
    ['uppercase', 'shout this'],
    [
      'summarize',
      'Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages.',
    ],
  ];

  for (const [name, input] of invocations) {
    const result = await cli.execute(name, input);
    console.log(`$ cli ${name}${input ? ` "${input}"` : ''}`);
    console.log(`  -> ${result}\n`);
  }

  try {
    await cli.execute('does-not-exist');
  } catch (error) {
    console.log('Unknown command correctly rejected:', (error as Error).message);
  }
}

main().catch((error) => {
  console.error('Example failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Write `README.md`**

```markdown
# 20 — Build a CLI (Bonus)

**Bonus · Package Coverage · Beginner · ~5 min**

## What problem does this solve?
You want a small set of named commands dispatching to one shared `AI`
instance — some AI-backed, some not — without hand-rolling a
name-to-handler map yourself.

## Why would I use this Aidex feature?
`CLI` holds one `AI` and a name→command map, auto-registering `"text"`
and `"version"` at construction. `cli.register({name, execute(ai, input)})`
adds more — as a plain object, not a special type, since `Command`
isn't even exported from the package. `cli.execute(name, input)`
dispatches by name and throws a clear error for an unknown one.

## When should I use this in a real project?
A small internal tool or script with a handful of named operations
where some need the AI and some don't — not a public terminal command
(this class has no `bin` entry; see its own README for why "CLI" here
means "command-dispatch class," not "shell executable").

## Requirements
- Node ≥18, pnpm
- Optional: `GEMINI_API_KEY` (falls back to `StubProvider` demo mode)

## Install
`pnpm install` from repo root.

## Run
```bash
pnpm --filter @aidex/examples build
pnpm --filter @aidex/examples build-a-cli
```

## Expected output
```
No GEMINI_API_KEY found — using StubProvider (demo mode).

$ cli version
  -> 0.2.1-alpha

$ cli text "Say hello to Aidex in one short sentence."
  -> stub:Say hello to Aidex in one short sentence.

$ cli uppercase "shout this"
  -> SHOUT THIS

$ cli summarize "Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages."
  -> stub:Summarize in one sentence: Aidex is a modular, provider-agnostic AI application platform with a frozen kernel and composable feature packages.

Unknown command correctly rejected: Unknown command: "does-not-exist"
```

## Concepts learned
- `CLI`'s constructor auto-registering built-in commands, plus `register()` for custom ones
- Commands as plain objects (structural typing) rather than an imported type
- Not every registered command needs to touch the `AI` instance it's handed

## Related packages
`@aidex/cli`, `@aidex/sdk`

## Next example
None — this is the last bonus example. See the master
[examples/README.md](../../README.md) for the full course.
```

- [ ] **Step 3: Build and run**

Run: `pnpm --filter @aidex/examples build && pnpm --filter @aidex/examples build-a-cli`
Expected: exits 0, prints all 4 invocations' output followed by the unknown-command rejection message. Verify the exact text matches (especially the `Unknown command: "does-not-exist"` message) and correct the README if not.

- [ ] **Step 4: Commit**

```bash
git add examples/src/20-build-a-cli
git commit -m "feat(examples): add 20-build-a-cli"
```

---

## Task 12: Update master `examples/README.md` with the 5 bonus examples

**Files:**
- Modify: `examples/README.md`

**Interfaces:**
- Consumes: all 5 new example READMEs from Tasks 7-11 (must exist before this task runs).

- [ ] **Step 1: Read the current `examples/README.md`**

Confirm its current structure (level table, "which example teaches X" index, package cross-reference table) — this task adds to it, doesn't replace it.

- [ ] **Step 2: Add a "Bonus: Package Coverage" section**

After the existing 9-level table, add a new section (before "Which example teaches X?" or wherever reads most naturally given the current file's layout):

```markdown
## Bonus: Package Coverage

These 5 examples aren't part of the 9-level narrative arc — they exist
so every publishable `@aidex/*` package has at least one runnable
example, not just the ones a "build an app" story naturally visits.

| # | Example | Difficulty | Time | Concept |
|---|---------|------------|------|---------|
| 16 | [Framework Adapters](src/16-framework-adapters/README.md) | Beginner | 5 min | `@aidex/adapters` — thin translation layers over one `AI` |
| 17 | [Memory Store](src/17-memory-store/README.md) | Beginner | 5 min | `@aidex/memory` — a generic, standalone KV primitive |
| 18 | [MCP Server](src/18-mcp-server/README.md) | Intermediate | 10 min | `@aidex/mcp` — a real MCP protocol server, driven in-process |
| 19 | [MCP Engine Bridge](src/19-mcp-engine-bridge/README.md) | Intermediate | 10 min | `@aidex/mcp-aidex` — expose Engines as MCP tools automatically |
| 20 | [Build a CLI](src/20-build-a-cli/README.md) | Beginner | 5 min | `@aidex/cli` — a command-dispatch class over one `AI` |
```

- [ ] **Step 3: Update the package cross-reference table**

Add/update these 5 rows (verify each against the actual `import` statements in the new example files, the same way the existing table's rows were verified — do not guess):

```markdown
| `@aidex/adapters` | 16 | — |
| `@aidex/memory` | 17 | — |
| `@aidex/mcp` | 18, 19 | — |
| `@aidex/mcp-aidex` | 19 | — |
| `@aidex/cli` | 20 | — |
```

Remove these packages from any "explore next, no example yet" callout if the existing table has one (check the current file — `@aidex/content`/`@aidex/media` remain uncovered and stay in that callout; only `adapters`/`memory`/`mcp`/`mcp-aidex`/`cli` move from "not covered" to "covered").

- [ ] **Step 4: Verify every new link resolves**

Run: `grep -oE '\[[^]]+\]\(([^)]+)\)' examples/README.md | grep -oE '\(([^)]+)\)' | tr -d '()' | while read -r link; do [ -f "examples/$link" ] || echo "MISSING: $link"; done`
Expected: no `MISSING` lines.

- [ ] **Step 5: Commit**

```bash
git add examples/README.md
git commit -m "docs(examples): add Bonus: Package Coverage section for 16-20"
```

---

## Task 13: Full validation

**Files:**
- Modify: any file found to fail the checks below (no new files expected)

**Interfaces:**
- Consumes: all outputs of Tasks 1-12.

- [ ] **Step 1: Full clean install, build, typecheck, lint, test**

Run: `pnpm install && pnpm typecheck && pnpm lint && pnpm build && pnpm test`
Expected: all exit 0. Test suite should still show all pre-existing tests passing (no regressions) — this plan touches zero `packages/*/src` files, only `package.json`/`LICENSE`/docs/CI/examples.

- [ ] **Step 2: Verify the pnpm guard actually blocks npm**

Run: `npm_config_user_agent="npm/10.0.0" node scripts/assert-pnpm.cjs; echo "exit: $?"`
Expected: prints the guard error, `exit: 1`.

Run (from inside one package directory, simulating what `npm publish` would trigger): `cd packages/sdk && npm_config_user_agent="npm/10.0.0" node ../../scripts/assert-pnpm.cjs; echo "exit: $?"; cd ../..`
Expected: same — `exit: 1`.

- [ ] **Step 3: Run all 5 new examples in demo mode**

```bash
unset GEMINI_API_KEY
node examples/dist/16-framework-adapters/index.js
node examples/dist/17-memory-store/index.js
node examples/dist/18-mcp-server/index.js
node examples/dist/19-mcp-engine-bridge/index.js
node examples/dist/20-build-a-cli/index.js
```
Expected: every command exits 0, no hangs, no uncaught exceptions.

- [ ] **Step 4: Confirm the pre-existing 15 examples still work (no regression from the 5 new workspace deps/tsconfig references)**

Run: `printf "\nhi\nexit\n" | node examples/dist/03-interactive-chat/index.js; echo "exit: $?"`
Expected: exits 0, same output shape as before this plan's changes.

- [ ] **Step 5: Confirm no unintended files were touched**

Run: `git diff --stat main` (or the appropriate base) and review the full file list — expect only: `scripts/assert-pnpm.cjs`, `.npmrc`, root `package.json`, all 22 `packages/*/package.json` + `packages/*/LICENSE`, `.github/workflows/release.yml`, root `README.md`, `packages/sdk/README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `examples/tsconfig.json`, `examples/package.json`, `examples/README.md`, and the 10 new files under `examples/src/16-*` through `examples/src/20-*`. No `packages/*/src` changes anywhere.

- [ ] **Step 6: Commit any fixes found**

```bash
git add -A
git commit -m "fix: address findings from full validation pass"
```
(Skip this commit if Step 1-5 found nothing to fix.)
