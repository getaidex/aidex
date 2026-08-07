import { AidexError } from '@aidex/core';

/**
 * Thrown when a Strategy's execute() receives a request.input that fails
 * its own basic shape validation (e.g. TextGenerationStrategy requiring a
 * non-empty string). Mirrors @aidex/prompts' InvalidPromptError shape —
 * extend AidexError, take a message, no other structured fields.
 */
export class InvalidStrategyInputError extends AidexError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStrategyInputError';
    Object.setPrototypeOf(this, InvalidStrategyInputError.prototype);
  }
}
