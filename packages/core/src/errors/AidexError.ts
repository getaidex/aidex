export interface AidexErrorOptions {
  code?: string;
  executionId?: string;
  cause?: unknown;
}

/**
 * Base class every Aidex-authored error extends, so applications get one
 * consistent `instanceof AidexError` check and one consistent serialized
 * shape regardless of which package threw. `code`/`executionId` are both
 * optional — most existing error sites don't populate them, only the ones
 * that already have an execution in scope do.
 */
export class AidexError extends Error {
  readonly code?: string;
  readonly executionId?: string;

  constructor(message: string, options: AidexErrorOptions = {}) {
    super(message);
    this.name = 'AidexError';
    this.code = options.code;
    this.executionId = options.executionId;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, AidexError.prototype);
  }

  toJSON(): Record<string, unknown> {
    // Spread every own enumerable property (so subclass-specific fields like
    // ProviderError's `provider` or StrategyNotFoundError's `strategyName`
    // survive JSON.stringify(), matching the pre-toJSON() behavior), except
    // `cause` (avoid serializing a nested Error / risking cycles). name/
    // message are applied last so they're never shadowed by a same-named
    // own property set earlier in a subclass constructor.
    const { cause: _cause, ...rest } = this as unknown as Record<string, unknown>;
    return { ...rest, name: this.name, message: this.message };
  }
}
