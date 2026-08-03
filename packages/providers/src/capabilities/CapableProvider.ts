import type { Provider } from '@aidex/core';
import type { ProviderCapabilities } from './ProviderCapabilities.js';

/**
 * A Provider that can describe its own capabilities. Lives only in
 * @aidex/providers — the frozen Provider contract in @aidex/core is
 * untouched. Future Engine/Strategy consumers can depend on this type
 * without importing any concrete provider.
 */
export interface CapableProvider extends Provider {
  getCapabilities(): ProviderCapabilities;
}
