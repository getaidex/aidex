/**
 * Thrown by every Document engine's execute() once input validation passes.
 * Phase 2 establishes the engine architecture (id/name/description/version
 * and a validated execute() signature) without wiring any AI provider —
 * this error is the deliberate, honest signal for that gap. Chosen over a
 * placeholder result object because every Result type in this package is
 * strongly typed (e.g. InvoiceExtractionResult.lineItems); fabricating an
 * empty/fake instance would misrepresent a call that never happened.
 */
export class NotImplementedError extends Error {
  readonly engineId: string;

  constructor(engineId: string) {
    super(
      `Engine "${engineId}" is not implemented yet. Its architecture ` +
        '(id/name/description/version/execute) is established and its input ' +
        'is validated, but execute() does not call an AI provider yet.'
    );
    this.name = 'NotImplementedError';
    this.engineId = engineId;
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
