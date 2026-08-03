import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from './InvalidMarketingEngineInputError.js';

describe('InvalidMarketingEngineInputError', () => {
  it('carries origin and a message combining origin with the reason', () => {
    const error = new InvalidMarketingEngineInputError('marketing.campaign.plan', 'missing "brief"');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('InvalidMarketingEngineInputError');
    expect(error.origin).toBe('marketing.campaign.plan');
    expect(error.message).toContain('marketing.campaign.plan');
    expect(error.message).toContain('missing "brief"');
  });
});
