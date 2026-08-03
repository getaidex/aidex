/**
 * Thrown when input fails basic shape validation — via an Engine's own
 * `this.id`, or (once a Strategy layer exists in a future phase) a
 * Strategy's own name. `origin` is named this way, not `engineId`, from
 * the start — mirrors @aidex/content's/@aidex/design's identically-named
 * error, which exists specifically because @aidex/document's own
 * production-readiness audit found `engineId` misleading once Strategies
 * started validating independently and passing their own name instead of
 * an engine id.
 */
export class InvalidMediaEngineInputError extends Error {
  readonly origin: string;

  constructor(origin: string, reason: string) {
    super(`Invalid input for "${origin}": ${reason}`);
    this.name = 'InvalidMediaEngineInputError';
    this.origin = origin;
    Object.setPrototypeOf(this, InvalidMediaEngineInputError.prototype);
  }
}
