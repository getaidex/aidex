import type { ProviderCapability } from '@aidex/providers';

/**
 * A pure description of one Engine — no execution logic, no Provider
 * reference, nothing runnable. `requestType`/`responseType` are the
 * request/result type *names* as strings (e.g. `"DocumentSummarizeRequest"`),
 * not the actual TypeScript types — types are erased at runtime, so a
 * metadata registry can only ever carry their names, not the types
 * themselves. `category` and `tags` are open strings, not a closed union:
 * future Feature Packs must be able to introduce new categories/tags
 * without this package changing. `requiredCapabilities` mirrors
 * @aidex/engines' Engine.requiredCapabilities field name exactly — reused
 * from @aidex/providers' capability model, never redeclared.
 */
export interface EngineMetadata {
  readonly id: string;
  readonly name: string;
  readonly featurePack: string;
  readonly version: string;
  readonly description: string;
  readonly requestType: string;
  readonly responseType: string;
  readonly tags: readonly string[];
  readonly category: string;
  readonly requiredCapabilities?: readonly ProviderCapability[];
}
