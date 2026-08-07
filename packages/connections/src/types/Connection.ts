import type { Metadata } from '@aidex/core';

/**
 * What ConnectionManager.get()/list() return — connection identity, provider
 * association, enabled state, and caller metadata. Deliberately has no
 * `config` field: the raw config (which may hold secrets) is stored
 * internally and only ever reachable through ConnectionManager.resolve().
 */
export interface Connection {
  readonly id: string;
  readonly providerType: string;
  readonly enabled: boolean;
  readonly metadata?: Metadata;
}
