import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import {
  StructuredOutputGenerationError,
  StructuredOutputUnsupportedError,
  StructuredOutputValidationError,
} from './errors.js';

describe('StructuredOutputUnsupportedError', () => {
  it('carries the provider name and a descriptive message', () => {
    const error = new StructuredOutputUnsupportedError('stub');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('StructuredOutputUnsupportedError');
    expect(error.provider).toBe('stub');
    expect(error.code).toBe('structured_output_unsupported');
    expect(error.message).toBe('stub: does not support native structured output');
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional executionId', () => {
    const error = new StructuredOutputUnsupportedError('stub', 'exec-1');
    expect(error.executionId).toBe('exec-1');
  });
});

describe('StructuredOutputGenerationError', () => {
  it('carries the provider name, reason-based message, and optional cause', () => {
    const cause = new SyntaxError('Unexpected token');
    const error = new StructuredOutputGenerationError(
      'gemini',
      'provider response was not valid JSON',
      'exec-2',
      cause
    );

    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('StructuredOutputGenerationError');
    expect(error.provider).toBe('gemini');
    expect(error.executionId).toBe('exec-2');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe(
      'gemini: structured output generation failed (provider response was not valid JSON)'
    );
  });

  it('never embeds raw provider content in the message', () => {
    const error = new StructuredOutputGenerationError('gemini', 'provider response was not valid JSON');
    expect(error.message).not.toContain('{');
  });
});

describe('StructuredOutputValidationError', () => {
  it('carries the provider name and structural issues, pluralized correctly', () => {
    const issues = [
      { path: '$.title', message: 'missing required property' },
      { path: '$.count', message: 'expected type number, got string' },
    ];
    const error = new StructuredOutputValidationError('gemini', issues, 'exec-3');

    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('StructuredOutputValidationError');
    expect(error.provider).toBe('gemini');
    expect(error.issues).toEqual(issues);
    expect(error.executionId).toBe('exec-3');
    expect(error.message).toBe('gemini: structured output failed schema validation (2 issues)');
  });

  it('uses singular "issue" for exactly one issue', () => {
    const error = new StructuredOutputValidationError('stub', [{ path: '$', message: 'x' }]);
    expect(error.message).toBe('stub: structured output failed schema validation (1 issue)');
  });

  it('issues never carry the actual offending value, only path/message', () => {
    const error = new StructuredOutputValidationError('stub', [
      { path: '$.secret', message: 'expected type string, got object' },
    ]);
    expect(JSON.stringify(error.issues)).not.toContain('sk-');
  });
});
