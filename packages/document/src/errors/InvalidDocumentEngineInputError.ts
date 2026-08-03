/**
 * Thrown when input fails basic shape validation — either a Document
 * engine's own execute() (via `this.id`, an actual DocumentEngineId), or
 * the Strategy underneath it validating independently (via `this.name`, a
 * Strategy name, since Strategies are public API and callable without
 * going through their Engine at all). `origin` is deliberately not typed
 * as `DocumentEngineId` — it holds whichever of the two a caller passed.
 */
export class InvalidDocumentEngineInputError extends Error {
  readonly origin: string;

  constructor(origin: string, reason: string) {
    super(`Invalid input for "${origin}": ${reason}`);
    this.name = 'InvalidDocumentEngineInputError';
    this.origin = origin;
    Object.setPrototypeOf(this, InvalidDocumentEngineInputError.prototype);
  }
}
