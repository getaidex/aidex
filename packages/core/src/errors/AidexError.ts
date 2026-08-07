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
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      executionId: this.executionId,
    };
  }
}
