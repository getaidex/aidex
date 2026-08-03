import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { IMAGE_OPTIMIZE_PROMPT } from '../prompts/imageOptimizePrompt.js';
import { ImageOptimizeStrategy } from './ImageOptimizeStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(IMAGE_OPTIMIZE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };
const VALID_RESPONSE = JSON.stringify({ description: 'Recompressed at 80% quality' });

describe('ImageOptimizeStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ImageOptimizeStrategy(makePrompts());
    expect(strategy.name).toBe('media-image-optimize');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageOptimizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe(SOURCE.mimeType);
  });

  it('uses the targetFormat mimeType when provided', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageOptimizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'webp' } },
      makeContext(provider)
    );

    expect(result.mimeType).toBe('image/webp');
  });

  it('passes maxFileSizeKb through deterministically (not AI-derived)', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageOptimizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, maxFileSizeKb: 200 } },
      makeContext(provider)
    );

    expect(result.fileSizeKb).toBe(200);
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageOptimizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new ImageOptimizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
