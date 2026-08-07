import { describe, expect, it } from 'vitest';
import { AidexError } from '../../errors/AidexError.js';
import { StrategyNotFoundError } from './StrategyNotFoundError.js';

describe('StrategyNotFoundError', () => {
  it('carries the missing strategy name and a descriptive message', () => {
    const error = new StrategyNotFoundError('summarize');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AidexError);
    expect(error).toBeInstanceOf(StrategyNotFoundError);
    expect(error.name).toBe('StrategyNotFoundError');
    expect(error.strategyName).toBe('summarize');
    expect(error.message).toBe('Strategy not found: "summarize"');
    expect(error.executionId).toBeUndefined();
  });

  it('carries an optional executionId through to AidexError', () => {
    const error = new StrategyNotFoundError('summarize', 'exec-123');

    expect(error.executionId).toBe('exec-123');
  });
});
