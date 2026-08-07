import type { Metadata } from '@aidex/core';

/**
 * What ConnectionManager.register() accepts. `config` is opaque and
 * provider-shaped (whatever the matching ProviderFactory expects) — it may
 * contain secrets and is never echoed back by get()/list().
 */
export interface RegisterConnectionInput {
  id: string;
  providerType: string;
  config: Record<string, unknown>;
  enabled?: boolean;
  metadata?: Metadata;
}
