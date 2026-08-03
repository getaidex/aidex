import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_POSTER_PROMPT } from '../prompts/designPosterPrompt.js';
import { DesignPosterStrategy } from './DesignPosterStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_POSTER_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A bold festival poster with layered typography' });

describe('DesignPosterStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignPosterStrategy(makePrompts());
    expect(strategy.name).toBe('design-poster');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignPosterResult, defaulting to pdf', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    const result = await strategy.execute({ strategy: 'design-poster', input: { brief: 'x' } }, makeContext(provider));

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('A bold festival poster with layered typography');
    expect(result.format).toBe('pdf');
  });

  it('includes branding colors/fonts in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-poster', input: { brief: 'x', branding: { colors: ['#000000'] } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('use these existing brand colors: #000000');
  });

  it('honors an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-poster', input: { brief: 'x', outputFormat: 'png' } },
      makeContext(provider)
    );

    expect(result.format).toBe('png');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-poster', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-poster', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignPosterStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-poster', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignPosterStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-poster', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignPosterStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-poster', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});
