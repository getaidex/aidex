import { describe, expect, it } from 'vitest';
import { AidexError } from '@aidex/core';
import { AIDisabledError } from './AIDisabledError.js';

describe('AIDisabledError', () => {
  it('carries a feature-scoped message and feature id when a feature is given', () => {
    const error = new AIDisabledError('text-generation', 'exec-1');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error.name).toBe('AIDisabledError');
    expect(error.feature).toBe('text-generation');
    expect(error.executionId).toBe('exec-1');
    expect(error.code).toBe('ai_disabled');
    expect(error.message).toBe('AI is disabled for feature "text-generation"');
  });

  it('carries a generic message and undefined feature when no feature is given', () => {
    const error = new AIDisabledError(undefined);
    expect(error.feature).toBeUndefined();
    expect(error.message).toBe('AI is disabled');
  });

  it('works without an executionId', () => {
    const error = new AIDisabledError('x');
    expect(error.executionId).toBeUndefined();
  });

  it('never embeds provider or secret data — toJSON only ever carries these fields', () => {
    const error = new AIDisabledError('text-generation', 'exec-1');
    expect(new Set(Object.keys(error.toJSON()))).toEqual(
      new Set(['name', 'code', 'executionId', 'feature', 'message'])
    );
  });
});
