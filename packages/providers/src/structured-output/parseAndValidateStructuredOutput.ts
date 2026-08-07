import type { JsonSchema } from './JsonSchema.js';
import { StructuredOutputGenerationError, StructuredOutputValidationError } from './errors.js';
import { validateAgainstSchema } from './validateJsonSchema.js';

/**
 * The one place every provider's structured-output path funnels through to
 * turn its raw text response into caller-typed, schema-validated data.
 * Centralizing this is what lets application code trust `data: T` without
 * ever parsing JSON or reading provider text itself. Never includes the raw
 * text in a thrown error.
 */
export function parseAndValidateStructuredOutput<T>(
  providerName: string,
  rawText: string,
  schema: JsonSchema,
  executionId?: string
): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (cause) {
    throw new StructuredOutputGenerationError(
      providerName,
      'provider response was not valid JSON',
      executionId,
      cause
    );
  }

  const issues = validateAgainstSchema(parsed, schema);
  if (issues.length > 0) {
    throw new StructuredOutputValidationError(providerName, issues, executionId);
  }

  return parsed as T;
}
