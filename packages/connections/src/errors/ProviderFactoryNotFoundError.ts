import { AidexError } from '@aidex/core';

/**
 * Thrown by ConnectionManager.resolve() when the connection's providerType
 * has no matching factory registered via registerProviderFactory().
 */
export class ProviderFactoryNotFoundError extends AidexError {
  readonly providerType: string;

  constructor(providerType: string, executionId?: string) {
    super(`No provider factory registered for provider type: "${providerType}"`, { executionId });
    this.name = 'ProviderFactoryNotFoundError';
    this.providerType = providerType;
    Object.setPrototypeOf(this, ProviderFactoryNotFoundError.prototype);
  }
}
