import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { VIDEO_THUMBNAIL_PROMPT } from '../prompts/videoThumbnailPrompt.js';
import { VideoThumbnailStrategy } from './VideoThumbnailStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(VIDEO_THUMBNAIL_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.mp4', mimeType: 'video/mp4' };
const VALID_RESPONSE = JSON.stringify({ description: 'A frame showing the product on a table' });

describe('VideoThumbnailStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new VideoThumbnailStrategy(makePrompts());
    expect(strategy.name).toBe('media-video-thumbnail');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoThumbnailStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('respects an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoThumbnailStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, outputFormat: 'png' } },
      makeContext(provider)
    );

    expect(result.mimeType).toBe('image/png');
  });

  it('includes timestampSeconds in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new VideoThumbnailStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, timestampSeconds: 12 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('12 seconds');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoThumbnailStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new VideoThumbnailStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
