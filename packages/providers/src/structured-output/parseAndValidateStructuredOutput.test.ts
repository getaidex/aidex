import { describe, expect, it } from 'vitest';
import type { JsonSchema } from './JsonSchema.js';
import { StructuredOutputGenerationError, StructuredOutputValidationError } from './errors.js';
import { parseAndValidateStructuredOutput } from './parseAndValidateStructuredOutput.js';

const personSchema: JsonSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('parseAndValidateStructuredOutput', () => {
  it('returns parsed, validated data on success', () => {
    const data = parseAndValidateStructuredOutput<{ name: string }>(
      'gemini',
      '{"name":"Ada"}',
      personSchema
    );
    expect(data).toEqual({ name: 'Ada' });
  });

  it('throws StructuredOutputGenerationError on unparseable JSON, without leaking raw content', () => {
    let caught: unknown;
    try {
      parseAndValidateStructuredOutput('gemini', '{not valid json', personSchema, 'exec-1');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StructuredOutputGenerationError);
    const genError = caught as StructuredOutputGenerationError;
    expect(genError.provider).toBe('gemini');
    expect(genError.executionId).toBe('exec-1');
    expect(genError.message).not.toContain('{not valid json');
    expect(JSON.stringify(genError.toJSON())).not.toContain('{not valid json');
  });

  it('throws StructuredOutputValidationError on schema-nonconformant JSON', () => {
    let caught: unknown;
    try {
      parseAndValidateStructuredOutput('gemini', '{}', personSchema, 'exec-2');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(StructuredOutputValidationError);
    const valError = caught as StructuredOutputValidationError;
    expect(valError.provider).toBe('gemini');
    expect(valError.executionId).toBe('exec-2');
    expect(valError.issues).toEqual([{ path: '$.name', message: 'missing required property' }]);
  });

  it('preserves the JSON.parse SyntaxError as the generation error cause', () => {
    let caught: unknown;
    try {
      parseAndValidateStructuredOutput('stub', 'not json at all', personSchema);
    } catch (error) {
      caught = error;
    }

    expect((caught as StructuredOutputGenerationError).cause).toBeInstanceOf(SyntaxError);
  });
});
