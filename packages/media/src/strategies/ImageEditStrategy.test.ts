import type { ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { IMAGE_EDIT_PROMPT } from '../prompts/imageEditPrompt.js';
import { ImageEditStrategy } from './ImageEditStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(IMAGE_EDIT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };
const VALID_RESPONSE = JSON.stringify({ description: 'The background has been removed' });

describe('ImageEditStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ImageEditStrategy(makePrompts());
    expect(strategy.name).toBe('media-image-edit');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into ImageEditResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageEditStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'Remove the background', source: SOURCE } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('image/png');
  });

  it('includes the source URL in the rendered prompt', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new ImageEditStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', source: SOURCE } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain(SOURCE.url);
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageEditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageEditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when the provider returns invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new ImageEditStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x', source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });

  it('records observability events when configured', async () => {
    const provider: Provider = { name: 'p', async generate() { return { content: VALID_RESPONSE }; } };
    const observability = new ObservabilityBus();
    const strategy = new ImageEditStrategy(makePrompts(), { observability });

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', source: SOURCE } },
      makeContext(provider)
    );

    expect(observability.getTimeline().map((e) => e.event)).toEqual(['provider', 'duration']);
  });
});
