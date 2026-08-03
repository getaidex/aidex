import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { IMAGE_GENERATE_PROMPT } from '../prompts/imageGeneratePrompt.js';
import { ImageGenerateStrategy } from './ImageGenerateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(IMAGE_GENERATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A minimalist product shot on a white background' });

describe('ImageGenerateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ImageGenerateStrategy(makePrompts());
    expect(strategy.name).toBe('media-image-generate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ImageGenerateResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'A red bicycle' } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(decodeURIComponent(result.assetUrl.split(',')[1])).toContain('minimalist product shot');
    expect(result.mimeType).toBe('image/png');
  });

  it('respects an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', outputFormat: 'webp' } },
      makeContext(provider)
    );

    expect(result.mimeType).toBe('image/webp');
  });

  it('includes dimensions in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new ImageGenerateStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', dimensions: { width: 800, height: 600 } } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('800x600 pixels');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ImageGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ImageGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = {
      name: 'p',
      async generate() { return { content: VALID_RESPONSE, metadata: { usage: { inputTokens: 1, outputTokens: 1 } } }; },
    };
    const observability = new ObservabilityBus();
    const strategy = new ImageGenerateStrategy(makePrompts(), { observability });

    await strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider));

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'tokens']);
  });

  it('records a provider failure and rethrows', async () => {
    const error = new Error('provider down');
    const provider: Provider = { name: 'p', async generate() { throw error; } };
    const observability = new ObservabilityBus();
    const strategy = new ImageGenerateStrategy(makePrompts(), { observability });

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBe(error);
    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration', 'error']);
  });
});
