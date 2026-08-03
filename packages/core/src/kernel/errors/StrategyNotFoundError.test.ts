import { describe, expect, it } from 'vitest';
import { StrategyNotFoundError } from './StrategyNotFoundError.js';

describe('StrategyNotFoundError', () => {
  it('carries the missing strategy name and a descriptive message', () => {
    const error = new StrategyNotFoundError('summarize');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StrategyNotFoundError);
    expect(error.name).toBe('StrategyNotFoundError');
    expect(error.strategyName).toBe('summarize');
    expect(error.message).toBe('Strategy not found: "summarize"');
  });
});
