import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_FLYER_PROMPT } from '../prompts/designFlyerPrompt.js';
import { DesignFlyerStrategy } from './DesignFlyerStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_FLYER_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A grand-opening flyer with bold color blocks' });

describe('DesignFlyerStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignFlyerStrategy(makePrompts());
    expect(strategy.name).toBe('design-flyer');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignFlyerResult, defaulting to pdf', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignFlyerStrategy(makePrompts());

    const result = await strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider));

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('A grand-opening flyer with bold color blocks');
    expect(result.format).toBe('pdf');
  });

  it('notes single-sided by default and double-sided when sides is 2', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignFlyerStrategy(makePrompts());

    await strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider));
    expect(seenPrompt).toContain('Design a single-sided flyer — front only.');

    await strategy.execute({ strategy: 'design-flyer', input: { brief: 'x', sides: 2 } }, makeContext(provider));
    expect(seenPrompt).toContain('Design both a front and a back side.');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignFlyerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-flyer', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignFlyerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignFlyerStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignFlyerStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignFlyerStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-flyer', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});
