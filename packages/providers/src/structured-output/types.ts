import type { AidexOptions, Metadata, Prompt, Provider } from '@aidex/core';
import type { JsonSchema } from './JsonSchema.js';

/** The schema-only intent an application expresses — never a provider-specific request shape. */
export interface StructuredOutputRequest {
  readonly schema: JsonSchema;
}

/**
 * `data` is provider output that has already been parsed and validated
 * against the requested schema — the only structured-output result shape
 * application code ever sees. `raw`/`metadata` mirror ProviderResponse for
 * callers that need provider diagnostics beyond the typed data.
 */
export interface StructuredOutputResult<T = unknown> {
  readonly data: T;
  readonly raw?: unknown;
  readonly metadata?: Metadata;
}

/**
 * A Provider that implements native structured output. Lives only in
 * @aidex/providers — like CapableProvider, the frozen Provider contract in
 * @aidex/core is untouched. A Provider should only implement this once it
 * genuinely translates the request into its vendor API's native
 * schema-constrained generation mechanism (see GeminiProvider); it must not
 * be implemented via fragile prompt-and-hope JSON extraction.
 */
export interface StructuredOutputProvider extends Provider {
  generateStructured<T = unknown>(
    prompt: Prompt,
    request: StructuredOutputRequest,
    options?: AidexOptions
  ): Promise<StructuredOutputResult<T>>;
}

/** Runtime capability guard — feature-detects generateStructured() without importing a concrete provider. */
export function isStructuredOutputProvider(provider: Provider): provider is StructuredOutputProvider {
  return typeof (provider as Partial<StructuredOutputProvider>).generateStructured === 'function';
}
