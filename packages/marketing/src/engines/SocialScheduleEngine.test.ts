import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { SocialScheduleEngine } from './SocialScheduleEngine.js';

const POSTS = [{ content: 'Post one', platform: 'instagram' }];
const VALID_RESPONSE = JSON.stringify({ order: [0] });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('SocialScheduleEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new SocialScheduleEngine();
    expect(engine.id).toBe('marketing.social.schedule');
    expect(engine.version).toBe('1.0.0');
  });

  it('schedules posts via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialScheduleEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { posts: POSTS, startDate: '2026-01-01' } })
    );

    expect(result.scheduled).toEqual([{ content: 'Post one', platform: 'instagram', publishAt: '2026-01-01' }]);
  });

  it('rejects a request with an empty posts array', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new SocialScheduleEngine();

    await expect(
      engine.execute(
        makeContext(provider, { strategy: engine.id, input: { posts: [], startDate: '2026-01-01' } })
      )
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });
});
