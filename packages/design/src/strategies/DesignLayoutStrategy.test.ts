import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { DESIGN_LAYOUT_PROMPT } from '../prompts/designLayoutPrompt.js';
import { DesignLayoutStrategy } from './DesignLayoutStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(DESIGN_LAYOUT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A hero section with headline left, image right' });

describe('DesignLayoutStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new DesignLayoutStrategy(makePrompts());
    expect(strategy.name).toBe('design-layout');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into DesignLayoutResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    const result = await strategy.execute({ strategy: 'design-layout', input: { brief: 'x' } }, makeContext(provider));

    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toBe('A hero section with headline left, image right');
    expect(result.format).toBe('png');
  });

  it('includes the content blocks in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = { name: 'inline', async generate(prompt) { seenPrompt = prompt.content; return { content: VALID_RESPONSE }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    await strategy.execute(
      { strategy: 'design-layout', input: { brief: 'x', contentBlocks: ['headline', 'product image', 'CTA'] } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('Arrange exactly these content blocks: headline, product image, CTA.');
  });

  it('honors an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: 'design-layout', input: { brief: 'x', outputFormat: 'jpg' } },
      makeContext(provider)
    );

    expect(result.format).toBe('jpg');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-layout', input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-layout', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new DesignLayoutStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: 'design-layout', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('propagates a provider error and records it via observability', async () => {
    const providerError = new Error('provider unavailable');
    const provider: Provider = { name: 'p', async generate() { throw providerError; } };
    const observability = new ObservabilityBus();
    const strategy = new DesignLayoutStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: 'design-layout', input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(providerError);

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });

  it('records observability events on success', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new DesignLayoutStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: 'design-layout', input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });
});
