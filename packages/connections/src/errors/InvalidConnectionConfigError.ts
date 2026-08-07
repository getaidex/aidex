import { AidexError } from '@aidex/core';

/**
 * Thrown by ConnectionManager.register()/update() when the given input
 * fails structural validation (id/providerType must be non-empty strings,
 * config must be a non-null object). Never validates provider-specific
 * requirements — this package has no dependency on any concrete provider.
 */
export class InvalidConnectionConfigError extends AidexError {
  readonly connectionId: string;
  readonly reason: string;

  constructor(connectionId: string, reason: string, executionId?: string) {
    super(`Invalid configuration for connection "${connectionId}": ${reason}`, { executionId });
    this.name = 'InvalidConnectionConfigError';
    this.connectionId = connectionId;
    this.reason = reason;
    Object.setPrototypeOf(this, InvalidConnectionConfigError.prototype);
  }
}
