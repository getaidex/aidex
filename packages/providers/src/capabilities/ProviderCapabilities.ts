import { ProviderCapability } from './ProviderCapability.js';

/**
 * What a Provider actually implements today, not what its vendor API is
 * theoretically capable of. Every ProviderCapability is always present as
 * a key so a consumer never needs an existence check before reading one.
 */
export type ProviderCapabilities = Readonly<Record<ProviderCapability, boolean>>;

/**
 * The only way to build a ProviderCapabilities value. Pure function, no
 * registry, no singleton, no mutable state — callers pass the capabilities
 * they genuinely support; everything else defaults to false. The result is
 * frozen so it can be safely cached and shared.
 */
export function createProviderCapabilities(
  supported: readonly ProviderCapability[]
): ProviderCapabilities {
  const result = {} as Record<ProviderCapability, boolean>;

  for (const capability of Object.values(ProviderCapability)) {
    result[capability] = supported.includes(capability);
  }

  return Object.freeze(result);
}
