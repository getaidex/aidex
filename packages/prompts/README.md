# @aidex/prompts

## Installation

```sh
pnpm add @aidex/prompts
```

```sh
npm install @aidex/prompts
```

A central registry for managing prompts: register, version, look up by id,
and render with variable substitution and validation.

## Contents

- **`types/PromptTemplate`** — `{ id, version, template, variables?, locale?
  }`. `variables` declares the `{{name}}` placeholders a template expects;
  `locale` is forward-compatible plumbing for future localization support —
  carried on the type today, not yet used for any lookup/fallback logic.
- **`registry/PromptRegistry`** — `register()`, `has()`, `get()`,
  `listVersions()`, `list()`, `render()`. Each `id` can hold multiple
  `version`s; `get()`/`render()` default to whichever version was most
  recently registered ("latest") when no specific version is requested.
  `register()` validates the prompt's basic shape (non-empty `id`/`version`/
  `template`, throwing `InvalidPromptError` otherwise) and throws
  `@aidex/core`'s `DuplicateRegistrationError` for a duplicate `id@version`
  pair — reused, not reimplemented.
- **`render/renderPrompt`** — the pure substitution function `PromptRegistry.render()`
  calls internally: validates every variable the template declared as
  required is present (`MissingPromptVariableError` otherwise), then
  replaces each `{{name}}` placeholder. An undeclared, unsupplied
  placeholder is left untouched rather than silently becoming `"undefined"`.
- **`PromptNotFoundError`** — thrown by `render()` when the requested
  `id`(`@version`) isn't registered. `has()`/`get()` stay plain accessors
  (`false`/`undefined`), matching the split every other registry in this
  codebase (`StrategyRegistry`, `EngineRegistry`) uses between silent lookup
  and fail-loud dispatch.

## Dependency direction

`@aidex/prompts` depends on `@aidex/core` only (`DuplicateRegistrationError`,
reused rather than reinvented). No dependency on any provider, strategy,
plugin, or application code.

## Intentional scope limits

- **Localization is not implemented yet** — `PromptTemplate.locale` exists
  as a field, but the registry doesn't resolve/fallback by locale. A future
  version would likely key lookups by `(id, locale, version)` instead of
  just `(id, version)`.
- **"Latest" is insertion-order, not semver** — the most recently
  *registered* version becomes latest, regardless of version string
  ordering. Registering `"1.0.0"` after `"2.0.0"` makes `"1.0.0"` latest.
