import { AidexError } from '@aidex/core';

/**
 * Thrown by ConnectionManager.update()/enable()/disable()/resolve() when the
 * given connection id isn't registered. get()/has() stay plain accessors
 * (return undefined/false), and remove() returns false rather than
 * throwing — this is for operations that require the connection to exist to
 * do their job, matching EngineNotFoundError's split between silent lookup
 * and fail-loud dispatch.
 */
export class ConnectionNotFoundError extends AidexError {
  readonly connectionId: string;

  constructor(connectionId: string, executionId?: string) {
    super(`Connection not found: "${connectionId}"`, { executionId });
    this.name = 'ConnectionNotFoundError';
    this.connectionId = connectionId;
    Object.setPrototypeOf(this, ConnectionNotFoundError.prototype);
  }
}
