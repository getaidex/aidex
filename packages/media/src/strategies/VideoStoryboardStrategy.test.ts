import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { VIDEO_STORYBOARD_PROMPT } from '../prompts/videoStoryboardPrompt.js';
import { VideoStoryboardStrategy } from './VideoStoryboardStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(VIDEO_STORYBOARD_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({
  scenes: [
    { description: 'Opening shot of the product', durationSeconds: 3 },
    { description: 'Close-up of the packaging' },
  ],
});

describe('VideoStoryboardStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new VideoStoryboardStrategy(makePrompts());
    expect(strategy.name).toBe('media-video-storyboard');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses scenes into VideoStoryboardResult, genuinely textual (no data: URI wrapping)', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoStoryboardStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Launch video' } },
      makeContext(provider)
    );

    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]).toEqual({ description: 'Opening shot of the product', durationSeconds: 3 });
    expect(result.scenes[1]).toEqual({ description: 'Close-up of the packaging' });
  });

  it('includes sceneCount in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new VideoStoryboardStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', sceneCount: 5 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('exactly 5 scenes');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new VideoStoryboardStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when scenes is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ scenes: [] }) }; },
    };
    const strategy = new VideoStoryboardStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
