import { AidexError } from '@aidex/core';

/**
 * One issue found while validating provider-generated data against the
 * caller-supplied schema. `path` and `message` describe *where* and *how*
 * validation failed structurally (e.g. "expected string, got number") —
 * never the offending value itself, since that value came from a model
 * response and may echo caller-supplied or sensitive input.
 */
export interface SchemaValidationIssue {
  readonly path: string;
  readonly message: string;
}

/**
 * Thrown before any provider call is made when a structured-output request
 * targets a Provider that hasn't implemented native structured output.
 * Deliberately fails fast rather than silently falling back to prompt-based
 * JSON coaxing — see the structured-output design notes in this package.
 */
export class StructuredOutputUnsupportedError extends AidexError {
  readonly provider: string;

  constructor(provider: string, executionId?: string) {
    super(`${provider}: does not support native structured output`, {
      code: 'structured_output_unsupported',
      executionId,
    });
    this.name = 'StructuredOutputUnsupportedError';
    this.provider = provider;
    Object.setPrototypeOf(this, StructuredOutputUnsupportedError.prototype);
  }
}

/**
 * Thrown when a provider's structured-output call fails at the generation
 * step itself — e.g. the provider returned content that isn't parseable
 * JSON. `reason` is a short, safe, human-readable diagnostic; the raw
 * provider content is never attached.
 */
export class StructuredOutputGenerationError extends AidexError {
  readonly provider: string;

  constructor(provider: string, reason: string, executionId?: string, cause?: unknown) {
    super(`${provider}: structured output generation failed (${reason})`, {
      code: 'structured_output_generation_failed',
      executionId,
      cause,
    });
    this.name = 'StructuredOutputGenerationError';
    this.provider = provider;
    Object.setPrototypeOf(this, StructuredOutputGenerationError.prototype);
  }
}

/**
 * Thrown when a provider returned syntactically valid JSON that does not
 * conform to the caller's schema. `issues` carries structural diagnostics
 * only (see SchemaValidationIssue) — safe to log or surface to a caller.
 */
export class StructuredOutputValidationError extends AidexError {
  readonly provider: string;
  readonly issues: readonly SchemaValidationIssue[];

  constructor(provider: string, issues: readonly SchemaValidationIssue[], executionId?: string) {
    super(
      `${provider}: structured output failed schema validation (${issues.length} issue${issues.length === 1 ? '' : 's'})`,
      { code: 'structured_output_validation_failed', executionId }
    );
    this.name = 'StructuredOutputValidationError';
    this.provider = provider;
    this.issues = issues;
    Object.setPrototypeOf(this, StructuredOutputValidationError.prototype);
  }
}
