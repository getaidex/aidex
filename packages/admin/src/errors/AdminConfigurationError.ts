import { AidexError } from '@aidex/core';

/**
 * Thrown by the AdminController constructor when a required dependency
 * (connectionManager or aiControl) is missing — an Admin-owned invariant
 * (its own required composition contract), not a delegated error from
 * @aidex/connections or @aidex/ai-control. Mirrors @aidex/sdk's
 * MissingProviderError shape: message-only, no other structured fields.
 */
export class AdminConfigurationError extends AidexError {
  constructor(message: string) {
    super(message);
    this.name = 'AdminConfigurationError';
    Object.setPrototypeOf(this, AdminConfigurationError.prototype);
  }
}
