import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMarketingEngineInputError } from '../errors/InvalidMarketingEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { SOCIAL_SCHEDULE_PROMPT } from '../prompts/socialSchedulePrompt.js';
import { SocialScheduleStrategy } from './SocialScheduleStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(SOCIAL_SCHEDULE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const POSTS = [
  { content: 'Post one', platform: 'instagram' },
  { content: 'Post two', platform: 'twitter' },
];

describe('SocialScheduleStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new SocialScheduleStrategy(makePrompts());
    expect(strategy.name).toBe('marketing-social-schedule');
    expect(strategy.version).toBe('1.0.0');
  });

  it('reorders posts per the AI-decided order, with deterministic publishAt dates', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ order: [1, 0] }) }; },
    };
    const strategy = new SocialScheduleStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { posts: POSTS, startDate: '2026-01-01' } },
      makeContext(provider)
    );

    expect(result.scheduled).toEqual([
      { content: 'Post two', platform: 'twitter', publishAt: '2026-01-01' },
      { content: 'Post one', platform: 'instagram', publishAt: '2026-01-02' },
    ]);
  });

  it('rejects a missing startDate', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ order: [0, 1] }) }; },
    };
    const strategy = new SocialScheduleStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { posts: POSTS } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('rejects an empty posts array', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ order: [] }) }; },
    };
    const strategy = new SocialScheduleStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { posts: [], startDate: '2026-01-01' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(InvalidMarketingEngineInputError);
  });

  it('throws UnparsableProviderResponseError when order is not a valid permutation (wrong length)', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ order: [0] }) }; },
    };
    const strategy = new SocialScheduleStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { posts: POSTS, startDate: '2026-01-01' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when order has duplicate or out-of-range indices', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ order: [0, 0] }) }; },
    };
    const strategy = new SocialScheduleStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { posts: POSTS, startDate: '2026-01-01' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
