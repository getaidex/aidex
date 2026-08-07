import type { JsonSchema, JsonSchemaType } from './JsonSchema.js';

function sampleForType(type: JsonSchemaType, schema: JsonSchema): unknown {
  switch (type) {
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return schema.items && (schema.minItems ?? 0) > 0
        ? Array.from({ length: schema.minItems ?? 1 }, () => generateSampleValue(schema.items as JsonSchema))
        : [];
    case 'object':
      return sampleObject(schema);
    case 'null':
      return null;
  }
}

function sampleObject(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const required = new Set(schema.required ?? []);
  for (const [key, propSchema] of Object.entries(schema.properties ?? {})) {
    if (required.has(key) || schema.required === undefined) {
      result[key] = generateSampleValue(propSchema);
    }
  }
  return result;
}

/**
 * Deterministically builds a value that satisfies `schema` — no randomness,
 * no network, no model call. Used only by StubProvider so tests get a
 * schema-conformant structured-output result without any external
 * dependency. Not a general-purpose JSON Schema fixture generator: it
 * covers exactly the JsonSchema subset this package validates.
 */
export function generateSampleValue(schema: JsonSchema): unknown {
  if (schema.enum && schema.enum.length > 0) {
    return schema.enum[0];
  }
  if (schema.anyOf && schema.anyOf.length > 0) {
    return generateSampleValue(schema.anyOf[0]);
  }

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  return sampleForType(type ?? 'object', schema);
}
