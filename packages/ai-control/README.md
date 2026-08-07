# @aidex/ai-control

## Installation

```sh
pnpm add @aidex/ai-control
```

```sh
npm install @aidex/ai-control
```

Framework-agnostic global and per-feature AI enable/disable, enforced before
any `Provider` is called. This is the foundation a future `@aidex/admin`
adapter (React/Angular/Vue/etc.) will read from and write to — this package
itself has no UI, no admin dashboard, and no knowledge of any specific
application's feature names.

## Usage

```ts
import { Aidex } from '@aidex/core';
import { AIFeatureControlPlugin, InMemoryAIFeatureControl } from '@aidex/ai-control';

const control = new InMemoryAIFeatureControl(); // enabled: true by default

const aidex = new Aidex({
  provider: myProvider,
  plugins: [new AIFeatureControlPlugin(control)],
});

// ...later, e.g. from an admin adapter:
control.setEnabled(false); // every subsequent aidex.execute() rejects with AIDisabledError
control.setFeatureEnabled('text-generation', false); // disable just one strategy/feature
control.getState(); // { enabled: false, features: { 'text-generation': false } } — safe to log/serialize
```

`AIFeatureControlPlugin` hooks into the existing `Plugin.beforeExecute` /
`Lifecycle` extension point in `@aidex/core` — no kernel changes were
required. When AI is disabled, `Aidex.execute()` throws `AIDisabledError`
(carrying `executionId`) before it looks up or runs any `Strategy`, so no
`Provider` is ever called and non-AI application code is entirely
unaffected.

The feature id defaults to the invoked `Strategy`'s `name` (e.g.
`'text-generation'`, `'structured-output'`) — no separate feature-naming
system to keep in sync.

## Design notes

- **Global always wins.** A feature can be turned off while AI is globally
  on; no feature-level override can turn AI back on while globally disabled.
  One authoritative flag, not two.
- **No secrets, ever.** This package never sees `Provider` or Connection
  config — `getState()` is always safe to log or hand to an admin UI.
- **Not a kill switch for the host application.** Only Aidex AI execution is
  gated; everything else in the application keeps working normally.
