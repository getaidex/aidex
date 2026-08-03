import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { VIDEO_EDIT_PROMPT } from '../prompts/videoEditPrompt.js';
import { VideoEditStrategy } from './VideoEditStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(VIDEO_EDIT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.mp4', mimeType: 'video/mp4' };
const VALID_RESPONSE = JSON.stringify({ description: 'The intro has been trimmed to 5 seconds' });

describe('VideoEditStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new VideoEditStrategy(makePrompts());
    expect(strategy.name).toBe('media-video-edit');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into VideoEditResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoEditStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Trim the intro', source: SOURCE } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('video/mp4');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoEditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError for invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new VideoEditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x', source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
