import type { AIControlState, AIFeatureControl } from './types/AIFeatureControl.js';

export interface InMemoryAIFeatureControlConfig {
  /** Defaults to true — installing this package must never silently turn AI off for an existing application. */
  enabled?: boolean;
}

/**
 * The default AIFeatureControl implementation: process-local mutable state,
 * no persistence, no network. Suitable as-is for a single-process
 * application, and as the reference shape a future persisted/admin-backed
 * implementation (same interface, different storage) would follow.
 */
export class InMemoryAIFeatureControl implements AIFeatureControl {
  #enabled: boolean;
  readonly #features = new Map<string, boolean>();

  constructor(config: InMemoryAIFeatureControlConfig = {}) {
    this.#enabled = config.enabled ?? true;
  }

  isEnabled(feature?: string): boolean {
    if (!this.#enabled) {
      return false;
    }
    if (feature !== undefined && this.#features.has(feature)) {
      return this.#features.get(feature) as boolean;
    }
    return true;
  }

  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
  }

  setFeatureEnabled(feature: string, enabled: boolean): void {
    this.#features.set(feature, enabled);
  }

  clearFeatureOverride(feature: string): void {
    this.#features.delete(feature);
  }

  getState(): AIControlState {
    return {
      enabled: this.#enabled,
      features: Object.fromEntries(this.#features),
    };
  }
}
