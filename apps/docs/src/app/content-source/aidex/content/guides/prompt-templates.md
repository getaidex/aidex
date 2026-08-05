# Prompt Templates

`@aidex/prompts` is a central registry for managing prompts: register,
version, look up by id, and render with variable substitution and
validation. It depends on `@aidex/core` only (for `DuplicateRegistrationError`,
reused rather than reinvented) — no dependency on any provider, strategy,
plugin, or application code.

## Registering a template

```ts
import { PromptRegistry } from '@aidex/prompts';

const registry = new PromptRegistry();

registry.register({
  id: 'greeting',
  version: '1.0.0',
  template: 'Say hello to {{name}} in one short sentence.',
  variables: ['name'],
});
```

A `PromptTemplate` is `{ id, version, template, variables?, locale? }`.
`variables` declares which `{{name}}` placeholders the template expects.
`register()` validates the basic shape — non-empty `id`/`version`/`template`
— throwing `InvalidPromptError` otherwise, and throws
`DuplicateRegistrationError` for a repeated `id@version` pair.

## Rendering it

```ts
const rendered = registry.render('greeting', { name: 'Aidex' });
// "Say hello to Aidex in one short sentence."
```

`render()` validates that every variable the template declared as required
is present, throwing `MissingPromptVariableError` if one is missing. An
undeclared, unsupplied placeholder is left untouched in the output rather
than silently becoming the string `"undefined"`.

## Versioning

Each `id` can hold multiple `version`s. `get()`/`render()` default to
whichever version was most recently *registered* — not the highest semver —
when no specific version is requested:

```ts
registry.register({ id: 'greeting', version: '2.0.0', template: '...' });
registry.render('greeting', { name: 'Aidex' }); // uses 2.0.0 — the latest registered
registry.render('greeting', { name: 'Aidex' }, '1.0.0'); // pin a specific version
```

Registering `"1.0.0"` after `"2.0.0"` would make `"1.0.0"` latest — "latest"
tracks insertion order, not version-string ordering.

## What this doesn't do yet

`locale` exists on `PromptTemplate` as forward-compatible plumbing, but the
registry doesn't resolve or fall back by locale today — a future version
would likely key lookups by `(id, locale, version)` instead of just
`(id, version)`.

See [02 — Prompt Templates](/examples/02-prompt-templates) for a full
runnable walkthrough.
