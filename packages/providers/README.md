# @aidex/providers

Concrete `Provider` implementations for the Aidex kernel (`@aidex/core`). Providers
are application-land code per `docs/architecture/provider-development-guide.md` —
this package supplies them so an app can `new Aidex({ provider: new StubProvider() })`
without hand-rolling a stub every time.

## Contents

- **`stub/StubProvider`** — the reference `Provider` implementation: complete,
  deterministic, no AI SDK dependency. Default provider for unit tests and
  examples, and the model every real provider (`GeminiProvider`,
  `OpenAIProvider`, `ClaudeProvider`, ...) follows for how `content`,
  `metadata`, and `raw` are meant to be populated — see the doc comments in
  `stub/StubProvider.ts` for exactly what each future provider will replace:
  the `content` transform becomes the vendor's actual generated text, the
  `metadata` object becomes real provider diagnostics (model name, token
  usage) instead of just an identity tag, and `raw` becomes the vendor SDK's
  actual native response instead of an echo of the input.
- **`gemini/GeminiProvider`** — the first production `Provider`, backed by the
  official [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK.
  Owns SDK client construction, API key/model configuration, and `generate()`;
  `gemini/mapping.ts` holds the pure Prompt→request / response→ProviderResponse
  translation, with no network logic of its own. No Gemini SDK type is
  exported outside this package — `raw` carries the native response typed as
  `unknown` from the outside.
- **`shared/withAbort`** — reusable `AidexOptions.signal`/`.timeout` helpers.
  `GeminiProvider.generate()` uses all three: `throwIfAborted` as a pre-flight
  guard, `withTimeoutSignal` to merge `options.timeout`/`options.signal` into
  one signal (passed to the SDK's own `config.abortSignal`), and `rejectOnAbort`
  to guarantee `generate()` itself rejects on abort even if the SDK's internal
  abort handling doesn't (verified in tests via a mocked SDK call that never
  resolves).
- **`capabilities/`** — the provider capability model: `ProviderCapability`
  (the fixed set of vendor-neutral capability identifiers), `ProviderCapabilities`
  (the total map every provider returns, so a lookup is never `undefined`),
  `createProviderCapabilities` (builds that map from a list of supported
  capabilities), and `CapableProvider` (a `Provider` that also implements
  `getCapabilities()`). Every provider in this package — `StubProvider` and
  `GeminiProvider` — implements `CapableProvider` and exposes `getCapabilities()`.

## Rules this package follows

- Imports only the public contracts from `@aidex/core` (`Provider`, `Prompt`,
  `ProviderResponse`, `AidexOptions`) — never a kernel internal.
- No base `Provider` class, no inheritance, no provider registry, no singleton,
  no factory — each provider is a standalone class implementing `Provider`
  directly, per `docs/architecture/design-principles.md`'s Composition over
  Inheritance principle.
- `src/index.ts` exports provider classes (and their config types), plus the
  `capabilities/` module's public surface (`ProviderCapability`,
  `ProviderCapabilities`, `createProviderCapabilities`, `CapableProvider`) —
  internal mapping/translation helpers stay unexported.
