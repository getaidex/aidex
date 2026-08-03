/**
 * Thrown when a Strategy's execute() receives a request.input that fails
 * its own basic shape validation (e.g. TextGenerationStrategy requiring a
 * non-empty string). Mirrors @aidex/prompts' InvalidPromptError shape —
 * extend Error, take a message, no other structured fields.
 */
export class InvalidStrategyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidStrategyInputError';
    Object.setPrototypeOf(this, InvalidStrategyInputError.prototype);
  }
}
