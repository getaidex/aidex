import { AidexError } from '@aidex/core';

/**
 * Thrown by ConnectionManager.resolve() when the connection exists but is
 * disabled (enabled: false) — distinct from ConnectionNotFoundError so a
 * caller can tell "doesn't exist" apart from "exists but turned off."
 */
export class DisabledConnectionError extends AidexError {
  readonly connectionId: string;

  constructor(connectionId: string, executionId?: string) {
    super(`Connection is disabled: "${connectionId}"`, { executionId });
    this.name = 'DisabledConnectionError';
    this.connectionId = connectionId;
    Object.setPrototypeOf(this, DisabledConnectionError.prototype);
  }
}
