import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_GENERATE_PROMPT } from '../prompts/designGeneratePrompt.js';
import { DesignGenerateStrategy } from './DesignGenerateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_GENERATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A warm, minimalist product hero shot' });

describe('DesignGenerateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignGenerateStrategy(makePrompts());
    expect(strategy.name).toBe('design-generate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignGenerateResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    const result = await strategy.execute({ strategy: 'design-generate', input: { brief: 'x' } }, makeContext(provider));

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('A warm, minimalist product hero shot');
    expect(result.format).toBe('png');
  });

  it('includes targetAudience/style and branding colors/fonts in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    await strategy.execute(
      {
        strategy: 'design-generate',
        input: {
          brief: 'x',
          targetAudience: 'families',
          style: 'playful',
          branding: { colors: ['#FF0000'], fonts: ['Inter'] },
        },
      },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('the target audience is families');
    expect(seenPrompt).toContain('use a playful style');
    expect(seenPrompt).toContain('use these existing brand colors: #FF0000');
    expect(seenPrompt).toContain('reflect these existing brand fonts: Inter');
  });

  it('honors an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-generate', input: { brief: 'x', outputFormat: 'svg' } },
      makeContext(provider)
    );

    expect(result.format).toBe('svg');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-generate', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-generate', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-generate', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignGenerateStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-generate', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignGenerateStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-generate', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});
