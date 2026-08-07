import { describe, expect, it } from 'vitest';
import type { JsonSchema } from './JsonSchema.js';
import { validateAgainstSchema } from './validateJsonSchema.js';

describe('validateAgainstSchema', () => {
  it('accepts a value matching a primitive type', () => {
    expect(validateAgainstSchema('hello', { type: 'string' })).toEqual([]);
  });

  it('rejects a value with the wrong primitive type', () => {
    const issues = validateAgainstSchema(42, { type: 'string' });
    expect(issues).toEqual([{ path: '$', message: 'expected type string, got integer' }]);
  });

  it('treats an integer as satisfying a "number" type', () => {
    expect(validateAgainstSchema(5, { type: 'number' })).toEqual([]);
  });

  it('distinguishes integer from number when "integer" is required', () => {
    expect(validateAgainstSchema(5.5, { type: 'integer' })).toEqual([
      { path: '$', message: 'expected type integer, got number' },
    ]);
  });

  it('accepts any type in a type array', () => {
    expect(validateAgainstSchema(null, { type: ['string', 'null'] })).toEqual([]);
  });

  it('validates enum membership', () => {
    const schema: JsonSchema = { type: 'string', enum: ['a', 'b'] };
    expect(validateAgainstSchema('a', schema)).toEqual([]);
    expect(validateAgainstSchema('c', schema)).toEqual([
      { path: '$', message: 'value is not one of the allowed enum values' },
    ]);
  });

  it('reports missing required properties with a property-scoped path', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };

    expect(validateAgainstSchema({}, schema)).toEqual([
      { path: '$.name', message: 'missing required property' },
    ]);
  });

  it('recurses into nested object properties', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: { zip: { type: 'string' } },
          required: ['zip'],
        },
      },
      required: ['address'],
    };

    expect(validateAgainstSchema({ address: {} }, schema)).toEqual([
      { path: '$.address.zip', message: 'missing required property' },
    ]);
  });

  it('rejects additional properties when additionalProperties is false', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    };

    expect(validateAgainstSchema({ name: 'x', extra: 1 }, schema)).toEqual([
      { path: '$.extra', message: 'additional property not allowed' },
    ]);
  });

  it('allows additional properties by default', () => {
    const schema: JsonSchema = { type: 'object', properties: { name: { type: 'string' } } };
    expect(validateAgainstSchema({ name: 'x', extra: 1 }, schema)).toEqual([]);
  });

  it('validates array items and reports an index-scoped path', () => {
    const schema: JsonSchema = { type: 'array', items: { type: 'string' } };
    expect(validateAgainstSchema(['a', 2, 'c'], schema)).toEqual([
      { path: '$[1]', message: 'expected type string, got integer' },
    ]);
  });

  it('validates minItems/maxItems', () => {
    const schema: JsonSchema = { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 };
    expect(validateAgainstSchema(['a'], schema)).toEqual([
      { path: '$', message: 'expected at least 2 items, got 1' },
    ]);
    expect(validateAgainstSchema(['a', 'b', 'c', 'd'], schema)).toEqual([
      { path: '$', message: 'expected at most 3 items, got 4' },
    ]);
  });

  it('validates minimum/maximum for numbers', () => {
    const schema: JsonSchema = { type: 'number', minimum: 0, maximum: 10 };
    expect(validateAgainstSchema(-1, schema)).toEqual([{ path: '$', message: 'expected >= 0, got -1' }]);
    expect(validateAgainstSchema(11, schema)).toEqual([{ path: '$', message: 'expected <= 10, got 11' }]);
    expect(validateAgainstSchema(5, schema)).toEqual([]);
  });

  it('validates anyOf, passing when at least one branch matches', () => {
    const schema: JsonSchema = { anyOf: [{ type: 'string' }, { type: 'number' }] };
    expect(validateAgainstSchema('x', schema)).toEqual([]);
    expect(validateAgainstSchema(1, schema)).toEqual([]);
    expect(validateAgainstSchema(true, schema)).toEqual([
      { path: '$', message: 'value did not match any schema in anyOf' },
    ]);
  });

  it('ignores unrecognized keywords rather than rejecting the schema', () => {
    const schema = { type: 'string', format: 'email', $comment: 'unused' } as JsonSchema;
    expect(validateAgainstSchema('a@b.com', schema)).toEqual([]);
  });

  it('short-circuits nested checks on a top-level type mismatch', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    };
    expect(validateAgainstSchema('not an object', schema)).toEqual([
      { path: '$', message: 'expected type object, got string' },
    ]);
  });
});
