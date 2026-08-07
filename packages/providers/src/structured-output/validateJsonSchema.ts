import type { JsonSchema, JsonSchemaType } from './JsonSchema.js';
import type { SchemaValidationIssue } from './errors.js';

function typeOf(value: unknown): JsonSchemaType {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  return 'object';
}

function matchesType(actual: JsonSchemaType, expected: JsonSchemaType): boolean {
  // A JSON "integer" is also a valid "number".
  return actual === expected || (expected === 'number' && actual === 'integer');
}

/**
 * Structurally validates `value` against `schema`, covering the subset of
 * JSON Schema described in JsonSchema.ts (type, enum, properties/required/
 * additionalProperties, items, min/maxItems, minimum/maximum, anyOf).
 * Unrecognized keywords are ignored rather than rejected. Returns an empty
 * array when valid.
 */
export function validateAgainstSchema(
  value: unknown,
  schema: JsonSchema,
  path = '$'
): SchemaValidationIssue[] {
  if (schema.anyOf) {
    const branchResults = schema.anyOf.map((branch) => validateAgainstSchema(value, branch, path));
    if (branchResults.some((issues) => issues.length === 0)) {
      return [];
    }
    return [{ path, message: 'value did not match any schema in anyOf' }];
  }

  const issues: SchemaValidationIssue[] = [];
  const actualType = typeOf(value);

  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expectedTypes.some((expected) => matchesType(actualType, expected))) {
      issues.push({
        path,
        message: `expected type ${expectedTypes.join(' | ')}, got ${actualType}`,
      });
      // Type mismatch makes structural checks below meaningless/unsafe to run.
      return issues;
    }
  }

  if (schema.enum && !schema.enum.some((allowed) => allowed === value)) {
    issues.push({ path, message: 'value is not one of the allowed enum values' });
  }

  if (actualType === 'object' && (schema.properties || schema.required)) {
    const obj = value as Record<string, unknown>;

    for (const key of schema.required ?? []) {
      if (!(key in obj)) {
        issues.push({ path: `${path}.${key}`, message: 'missing required property' });
      }
    }

    for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
      if (key in obj) {
        issues.push(...validateAgainstSchema(obj[key], propSchema, `${path}.${key}`));
      }
    }

    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) {
          issues.push({ path: `${path}.${key}`, message: 'additional property not allowed' });
        }
      }
    }
  }

  if (actualType === 'array') {
    const arr = value as unknown[];

    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      issues.push({ path, message: `expected at least ${schema.minItems} items, got ${arr.length}` });
    }
    if (schema.maxItems !== undefined && arr.length > schema.maxItems) {
      issues.push({ path, message: `expected at most ${schema.maxItems} items, got ${arr.length}` });
    }
    if (schema.items) {
      arr.forEach((item, index) => {
        issues.push(...validateAgainstSchema(item, schema.items as JsonSchema, `${path}[${index}]`));
      });
    }
  }

  if (actualType === 'number' || actualType === 'integer') {
    const num = value as number;
    if (schema.minimum !== undefined && num < schema.minimum) {
      issues.push({ path, message: `expected >= ${schema.minimum}, got ${num}` });
    }
    if (schema.maximum !== undefined && num > schema.maximum) {
      issues.push({ path, message: `expected <= ${schema.maximum}, got ${num}` });
    }
  }

  return issues;
}
