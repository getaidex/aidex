import { AidexError } from '@aidex/core';
import type { ProviderCapability } from '@aidex/providers';

/**
 * Thrown by EngineRegistry.execute() when the provider in the given
 * ExecutionContext does not support every capability the engine declares
 * via requiredCapabilities. Mirrors EngineNotFoundError's shape: a
 * fail-loud, descriptive error rather than letting the engine run against
 * a provider it cannot actually use.
 */
export class UnsupportedProviderCapabilityError extends AidexError {
  readonly engineId: string;
  readonly missingCapabilities: readonly ProviderCapability[];

  constructor(
    engineId: string,
    missingCapabilities: readonly ProviderCapability[],
    executionId?: string
  ) {
    super(
      `Engine "${engineId}" requires capabilities the provider does not support: ${missingCapabilities.join(', ')}`,
      { executionId }
    );
    this.name = 'UnsupportedProviderCapabilityError';
    this.engineId = engineId;
    this.missingCapabilities = missingCapabilities;
    Object.setPrototypeOf(this, UnsupportedProviderCapabilityError.prototype);
  }
}
