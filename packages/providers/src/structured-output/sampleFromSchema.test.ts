import { describe, expect, it } from 'vitest';
import type { JsonSchema } from './JsonSchema.js';
import { generateSampleValue } from './sampleFromSchema.js';
import { validateAgainstSchema } from './validateJsonSchema.js';

describe('generateSampleValue', () => {
  it('produces a value that validates against the schema it was generated from', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        count: { type: 'integer', minimum: 1 },
        tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
        status: { type: 'string', enum: ['open', 'closed'] },
      },
      required: ['title', 'count', 'tags', 'status'],
    };

    const value = generateSampleValue(schema);
    expect(validateAgainstSchema(value, schema)).toEqual([]);
  });

  it('is deterministic across repeated calls', () => {
    const schema: JsonSchema = { type: 'object', properties: { a: { type: 'string' } }, required: ['a'] };
    expect(generateSampleValue(schema)).toEqual(generateSampleValue(schema));
  });

  it('picks the first enum value', () => {
    expect(generateSampleValue({ enum: ['b', 'a'] })).toBe('b');
  });

  it('omits non-required properties by default', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: { required: { type: 'string' }, optional: { type: 'string' } },
      required: ['required'],
    };
    expect(generateSampleValue(schema)).toEqual({ required: '' });
  });

  it('produces primitive defaults for each type', () => {
    expect(generateSampleValue({ type: 'string' })).toBe('');
    expect(generateSampleValue({ type: 'boolean' })).toBe(false);
    expect(generateSampleValue({ type: 'null' })).toBe(null);
    expect(generateSampleValue({ type: 'number', minimum: 5 })).toBe(5);
  });
});
