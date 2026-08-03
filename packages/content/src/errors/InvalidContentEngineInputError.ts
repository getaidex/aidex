/**
 * Thrown when input fails basic shape validation — either a Content
 * engine's own execute() (via `this.id`, an actual ContentEngineId), or a
 * future Strategy underneath it validating independently (via a Strategy
 * name), the same way @aidex/document's identically-named error works.
 * `origin` is deliberately not typed as `ContentEngineId` — it holds
 * whichever of the two a caller passed. Named `origin` from the start
 * (not `engineId`) specifically because @aidex/document's own audit found
 * that name misleading once Strategies started validating independently.
 */
export class InvalidContentEngineInputError extends Error {
  readonly origin: string;

  constructor(origin: string, reason: string) {
    super(`Invalid input for "${origin}": ${reason}`);
    this.name = 'InvalidContentEngineInputError';
    this.origin = origin;
    Object.setPrototypeOf(this, InvalidContentEngineInputError.prototype);
  }
}
