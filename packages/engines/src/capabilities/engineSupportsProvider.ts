import type { Provider } from '@aidex/core';
import type { CapableProvider, ProviderCapability } from '@aidex/providers';
import type { Engine } from '../types/Engine.js';

/**
 * Reads whatever capabilities `provider` declares, tolerating providers
 * that don't implement CapableProvider (treated as declaring none) and
 * custom providers whose getCapabilities() returns something malformed
 * (null, or any non-object) — also treated as declaring none, rather than
 * throwing when indexed.
 */
function getProviderCapabilities(provider: Provider): Partial<Record<ProviderCapability, boolean>> {
  const maybeCapable = provider as Partial<CapableProvider>;
  if (typeof maybeCapable.getCapabilities !== 'function') {
    return {};
  }
  const capabilities = maybeCapable.getCapabilities();
  return capabilities && typeof capabilities === 'object' ? capabilities : {};
}

/**
 * Which of engine.requiredCapabilities the provider does not support.
 * Empty (and requiredCapabilities omitted/empty) means fully supported —
 * the single source of truth EngineRegistry.execute() and
 * engineSupportsProvider() both build on.
 */
export function missingCapabilities(
  engine: Pick<Engine, 'requiredCapabilities'>,
  provider: Provider
): readonly ProviderCapability[] {
  const required = engine.requiredCapabilities;
  if (!required || required.length === 0) {
    return [];
  }
  const capabilities = getProviderCapabilities(provider);
  return required.filter((capability) => capabilities[capability] !== true);
}

/** Whether provider supports every capability engine.requiredCapabilities lists. */
export function engineSupportsProvider(
  engine: Pick<Engine, 'requiredCapabilities'>,
  provider: Provider
): boolean {
  return missingCapabilities(engine, provider).length === 0;
}
