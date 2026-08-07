import type { Provider } from '@aidex/core';

/**
 * Constructs a Provider from a connection's stored config. Applications
 * register one of these per providerType via
 * ConnectionManager.registerProviderFactory() — this package never imports
 * a concrete Provider implementation itself.
 */
export type ProviderFactory = (config: Record<string, unknown>) => Provider;
