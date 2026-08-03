# Project Structure

The [kernel philosophy doc](kernel-philosophy.md) fixed the *why*: Aidex is a kernel, applications
depend on it, it depends on nobody, and the Golden Rule keeps its surface small. This
document fixes the *where* — the physical folder layout inside `packages/core/src/`
that makes that philosophy enforceable rather than aspirational. A dependency
direction is only real if the folder structure makes the wrong import impossible to
miss in review; this document is the map that review is checked against.

The kernel described below is implemented and tested under `packages/core/src/`.
The tree that follows matches what is currently on disk.

## The full tree

```
packages/core/src/
  index.ts                          # package barrel — public surface only
  kernel/
    Aidex.ts
    configuration/
      AidexConfig.ts                 # kernel configuration ONLY
    registries/
      StrategyRegistry.ts           # private
      PluginRegistry.ts             # private
    lifecycle/
      Lifecycle.ts                  # private
    errors/
      StrategyNotFoundError.ts      # public
      DuplicateRegistrationError.ts # public
  types/
    AidexRequest.ts
    AidexOptions.ts
    ExecutionContext.ts
    Prompt.ts
    ProviderResponse.ts
    Metadata.ts
    Strategy.ts
    Provider.ts
    Plugin.ts
    ILogger.ts
    .gitkeep                          # leftover scaffold file; the ten .ts files
                                       # above are the real, populated contents (see below)
  providers/    (untouched, .gitkeep — future concrete providers, app-land)
  strategies/   (untouched, .gitkeep — future concrete strategies, app-land)
  builders/     (untouched, .gitkeep)
  validators/   (untouched, .gitkeep)
  prompts/      (untouched, .gitkeep)
  plugins/      (untouched, .gitkeep — future concrete plugins, app-land)
  shared/       (untouched, .gitkeep)
  utils/        (untouched, .gitkeep)
```

`packages/core/src/engine/` — the original scaffolded folder — is removed and
replaced by `kernel/`. Anywhere older scaffolding, notes, or muscle memory refers to
`engine/`, that name is stale; `kernel/` is the only folder that holds kernel
internals going forward.

## `kernel/` — the kernel itself

**Owns:** everything that makes Aidex run — the public `Aidex` class, the private
registries that back `registerStrategy()`/`use()`, the private lifecycle manager
that sequences boot/ready/beforeExecute/afterExecute/shutdown, the kernel's own
configuration type, and
the two public error classes the kernel throws.

**Who may depend on it:** applications depend on the *public* pieces of `kernel/`
(`Aidex`, `AidexConfig`, `StrategyNotFoundError`, `DuplicateRegistrationError`) via
`index.ts`. Nothing inside `packages/core/src/` other than `kernel/` itself may
import from `kernel/registries/` or `kernel/lifecycle/` — those two subfolders are
private and are never re-exported from `index.ts`, so from an application's
perspective they don't exist.

**Why it exists:** this is the one folder in the package that is allowed to know
about strategies, plugins, and lifecycle phases as *mechanisms*. Everything under
`kernel/` implements the "kernel executes" clause from the [kernel philosophy doc](kernel-philosophy.md) — it dispatches, it
sequences, it enforces uniqueness — and it does so without knowing what any specific
strategy, plugin, or provider actually does.

Four subfolders, four narrow jobs:

- **`kernel/Aidex.ts`** — the public `Aidex` class itself: `new Aidex(config)`,
  `.use(plugin)`, `.registerStrategy(strategy)`, `.execute(request)`. This is the
  entire locked public API described in the [kernel philosophy doc](kernel-philosophy.md)'s stability argument. It composes the
  registries, the lifecycle manager, and the configuration type; it contains no
  business logic and no knowledge of any one application.
- **`kernel/configuration/AidexConfig.ts`** — kernel configuration only. This file
  stays dedicated to `AidexConfig` alone; it deliberately does not grow into a
  catch-all for every type the kernel touches. `AidexConfig.ts` depends on `types/`
  (it references `Provider`, `ILogger`, etc.) but nothing in `types/` or elsewhere
  depends back on it.
- **`kernel/registries/`** (`StrategyRegistry.ts`, `PluginRegistry.ts`) — **private.**
  These hold the internal bookkeeping behind `registerStrategy()` and `use()`:
  name-keyed lookup, duplicate detection, hook wiring. They are implementation
  detail of `Aidex.ts` and are never exported from `index.ts`. An application can
  observe their effects (a strategy becomes callable; a duplicate name throws) but
  can never import `StrategyRegistry` or `PluginRegistry` directly.
- **`kernel/lifecycle/`** (`Lifecycle.ts`) — **private.** Sequences the
  boot → ready → beforeExecute → afterExecute → shutdown phases around a call to
  `execute()`. Like the registries, it is implementation detail of `Aidex.ts`, never
  exported, and never imported from outside `kernel/`.
- **`kernel/errors/`** (`StrategyNotFoundError.ts`, `DuplicateRegistrationError.ts`)
  — **public.** These are the only two error types the kernel defines:
  `StrategyNotFoundError` when `execute()` is called with an unregistered strategy
  name, `DuplicateRegistrationError` when `registerStrategy()` collides with an
  existing name. Both are exported from `index.ts` so applications can catch them by
  type. There are no application-level errors in this folder and never will be — a
  Firebase error, a Print Platform error, or a Design Platform error has no
  home in `kernel/errors/` under the Golden Rule from the [kernel philosophy doc](kernel-philosophy.md).

## `types/` — public contracts, not kernel internals

**Owns:** the ten shared interfaces the whole system is built around —
`AidexRequest`, `AidexOptions`, `ExecutionContext`, `Prompt`, `ProviderResponse`,
`Metadata`, `Strategy`, `Provider`, `Plugin`, and `ILogger`.

A leftover `types/.gitkeep` file still exists on disk alongside these ten real
`.ts` files — a scaffold artifact from before `types/` was populated. It serves
no purpose now that the folder holds real content and can be treated as
harmless; it is not evidence that `types/` is still an empty reserved folder
the way the eight folders below are.

**Who may depend on it:** everyone. `kernel/` depends on `types/` to type its own
public API; applications depend on `types/` to implement `Strategy`, `Provider`, and
`Plugin`, and to construct `AidexRequest` objects. The dependency arrow into `types/`
only ever points inward — `types/` itself depends on nothing else in
`packages/core/src/`.

**Why it exists, and why it is *not* "kernel internals":** it would be easy to
assume anything living inside `packages/core/src/` next to `kernel/` is part of the
kernel's private implementation. `types/` is the deliberate exception. These ten
files are the contracts applications write code *against* — a host application
implements `Strategy` and `Provider`, supplies an `ILogger`, and builds
`AidexRequest`/`AidexOptions` objects to pass into `execute()`. None of that is kernel
plumbing; it's the vocabulary applications use to talk to the kernel. That's also
why `types/` sits as a top-level sibling of `kernel/` rather than nested under it:
nesting it under `kernel/` would visually suggest it's private the way
`registries/` and `lifecycle/` are, which is exactly backwards. `types/` is reused
from the existing scaffolded folder rather than duplicated, per the "no new
abstractions" constraint on this design.

## `providers/`, `strategies/`, `plugins/`, `builders/`, `validators/`, `prompts/`, `shared/`, `utils/` — reserved, empty

**Own:** nothing yet. At the skeleton stage each of these eight folders contains
only a `.gitkeep` placeholder — no `.ts` files, no exports, no logic.

**Who may depend on them:** no one, in either direction, at this stage. Once
populated, they will hold *concrete, app-facing* implementations —
a real `GeminiProvider` in `providers/`, a real strategy implementation in
`strategies/`, a real plugin in `plugins/` — supplied by or on behalf of a specific
application, not by the kernel. Critically, the dependency arrow never runs from
`kernel/` or `types/` into any of these eight folders: kernel code never imports
from `providers/`, `strategies/`, `plugins/`, `builders/`, `validators/`,
`prompts/`, `shared/`, or `utils/`. If a future change requires the kernel to import
from one of these folders, that is a signal the change belongs outside the kernel
entirely, per the Golden Rule.

**Why they exist now, empty:** reserving the shape of the tree up front — rather
than adding these folders ad hoc later — makes the kernel/app-land boundary visible
in the repo layout itself before a single concrete provider or strategy is written.
Anyone opening `packages/core/src/` sees eight placeholders that say "this is where
application-facing implementations go" and two populated folders (`kernel/`,
`types/`) that say "this is the kernel." The emptiness is the point: it is evidence,
checkable at any commit, that no concrete provider/strategy/plugin logic has leaked
into the kernel package.

## Dependency direction

```
kernel/Aidex.ts
  ├── kernel/registries/   (StrategyRegistry, PluginRegistry — private)
  ├── kernel/lifecycle/    (Lifecycle — private)
  ├── kernel/errors/       (StrategyNotFoundError, DuplicateRegistrationError)
  ├── kernel/configuration/AidexConfig.ts
  └── types/*              (Strategy, Provider, Plugin, AidexRequest, ...)

kernel/configuration/AidexConfig.ts
  └── types/*

types/*
  └── (nothing in packages/core/src/ — types/ has no internal dependencies)

providers/  strategies/  plugins/  builders/  validators/  prompts/  shared/  utils/
  └── (not depended on by kernel/ or types/, ever)
```

Read this diagram as a set of rules, not just a diagram:

- `kernel/Aidex.ts` is the only file allowed to import from `kernel/registries/`,
  `kernel/lifecycle/`, `kernel/errors/`, and `kernel/configuration/` all at once —
  it's the composition point.
- `kernel/configuration/AidexConfig.ts` imports from `types/` (for `Provider`,
  `ILogger`, and similar contracts it references) and from nothing else in
  `kernel/` — configuration doesn't reach into registries or lifecycle.
- `types/*` imports from nothing else in `packages/core/src/`. The ten contract
  files may reference each other (e.g., `AidexRequest` referencing `AidexOptions`),
  but none of them import from `kernel/` or from any of the eight reserved
  folders.
- Nothing in `kernel/` or `types/` ever imports from `providers/`, `strategies/`,
  `plugins/`, `builders/`, `validators/`, `prompts/`, `shared/`, or `utils/` — that
  boundary is absolute and is exactly the folder-level enforcement of the [kernel philosophy doc](kernel-philosophy.md)'s
  "Aidex depends on nobody."

## `engine/` is gone

`packages/core/src/engine/` was the original scaffolded folder name before this
design was frozen. It has been removed and fully superseded by `kernel/`. There is
no transitional period where both exist, no re-export shim from `engine/` to
`kernel/`, and no reason for new code to reference `engine/` in any form — if it
shows up in a stale branch, a comment, or an old note, treat `kernel/` as the only
correct name.
