import { describe, expect, it } from 'vitest';
import { UnparsableProviderResponseError } from './UnparsableProviderResponseError.js';

describe('UnparsableProviderResponseError', () => {
  it('carries strategyName, rawContent, and a message combining both with the reason', () => {
    const error = new UnparsableProviderResponseError('marketing-campaign-plan', 'not json', 'invalid JSON');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnparsableProviderResponseError');
    expect(error.strategyName).toBe('marketing-campaign-plan');
    expect(error.rawContent).toBe('not json');
    expect(error.message).toContain('marketing-campaign-plan');
    expect(error.message).toContain('invalid JSON');
  });
});
