# Provider Integration Guide

The [Provider development guide](../architecture/provider-development-guide.md)
specifies the `Provider` interface itself — `{ name, generate(prompt,
options?) }` — and what a conforming implementation must and must not do.
This document is the companion reference: what a *real*, production-grade
provider built against that interface actually looks like, using `@aidex/providers`'
`GeminiProvider` (the first concrete provider shipped alongside Aidex) as the
worked example.

## What a real provider adds beyond the bare interface

The `Provider` interface itself is two members. A production implementation
built on top of it typically adds:

- **Authentication** — an API key or credential, resolved from explicit
  configuration or falling back to the vendor SDK's own environment
  resolution. Never hardcoded, never required to be read from `process.env`
  by the kernel itself — the provider's own constructor owns this.
- **Request mapping** — translating the provider-agnostic `Prompt` into
  whatever shape the vendor's SDK call expects.
- **Response mapping** — translating the vendor's native response back onto
  the standardized `ProviderResponse` shape (`{ content, raw?, metadata? }`).
- **Error translation** — mapping vendor-specific error types into a small,
  vendor-agnostic error hierarchy so calling code can handle failures
  consistently regardless of which provider is behind `context.provider`.
- **Observability wiring** — optionally reporting duration, token usage,
  cost, and success/failure events to `@aidex/observability`, gated entirely
  behind an optional constructor field so omitting it changes nothing about
  existing behavior.

None of this lives in `packages/core`. It's all provider-package
responsibility, built on top of the frozen kernel contract.

## Standardizing response metadata across providers

`ProviderResponse.metadata` is a free-form bag, but a multi-provider platform
benefits from a shared, optional convention for the common fields every
vendor response tends to have: `provider`, `model?`, `finishReason?`, and a
`usage?: { inputTokens?, outputTokens?, totalTokens? }` shape. Naming these
consistently — rather than letting each provider invent its own field names
for the same concept — is what lets application code read `usage.inputTokens`
without knowing or caring which vendor produced the response. Anything vendor-
specific that doesn't fit this shape belongs on `raw`, not forced into
`metadata`.

## Error translation, concretely

A small `ProviderError` hierarchy — `ProviderAuthenticationError`,
`ProviderRateLimitError`, `ProviderInvalidRequestError`,
`ProviderUnavailableError`, all extending a common `ProviderError` — lets
calling code write `catch (err) { if (err instanceof ProviderRateLimitError)
{ ... } }` once, and have it work the same way regardless of which concrete
provider is configured. A vendor SDK's error is mapped by status code or
error type into the closest match; anything that doesn't map cleanly becomes
a generic `ProviderError` wrapping the original as `.cause`, never left
untranslated. A provider's own cancellation (from a timeout or
`AbortSignal`) is a distinct, separately-typed error — it isn't a vendor
failure and shouldn't be translated as one.

## What stays out of a provider, even a real one

- **No retry logic.** A transient failure should propagate as a translated
  error, not be silently retried inside `generate()`. Retry policy is a
  cross-cutting concern that belongs in a `Plugin` or in the calling
  strategy — see the [Plugin development guide](../architecture/plugin-development-guide.md) —
  not duplicated into every provider.
- **No task-specific logic.** A provider that branches on
  `prompt.metadata.strategyName` to change its own behavior has drifted into
  strategy territory. Provider code stays generic across every strategy that
  might call it.
- **No provider-specific fields on `Prompt`.** Vendor-specific configuration
  (a model name, a safety-settings object, a temperature default) belongs on
  the provider's own constructor config, never bolted onto the shared
  `Prompt` type every strategy and every provider depends on.

## Testing a real provider

Test against a mocked SDK boundary, never a live API call: construction with
valid/invalid credentials, successful and failed `generate()` calls, timeout
and cancellation behavior, and — where the vendor SDK distinguishes them —
each error class the translation layer is supposed to produce. Token and
cost tracking (when observability is wired in) are tested the same way,
asserting on the events reported rather than on any real network response.
Streaming is the one common gap worth calling out explicitly if a provider
doesn't yet implement it: `AidexOptions.stream?: boolean` is reserved on the
frozen options type, but genuine token-by-token streaming needs a `Provider`
interface change (`generate()` returning an async iterable instead of a
single `Promise<ProviderResponse>`) — a kernel-level decision that deserves
its own ADR, not something a provider can add unilaterally.
