import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_BANNER_PROMPT } from '../prompts/designBannerPrompt.js';
import { DesignBannerStrategy } from './DesignBannerStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_BANNER_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A wide web banner with a bold sale headline' });

describe('DesignBannerStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignBannerStrategy(makePrompts());
    expect(strategy.name).toBe('design-banner');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignBannerResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBannerStrategy(makePrompts());

    const result = await strategy.execute({ strategy: 'design-banner', input: { brief: 'x' } }, makeContext(provider));

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('A wide web banner with a bold sale headline');
    expect(result.format).toBe('png');
  });

  it('includes the platform in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBannerStrategy(makePrompts());

    await strategy.execute({ strategy: 'design-banner', input: { brief: 'x', platform: 'web' } }, makeContext(provider));

    expect(seenPrompt).toContain('This banner is for: web.');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignBannerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-banner', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignBannerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-banner', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignBannerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-banner', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignBannerStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-banner', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignBannerStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-banner', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});
