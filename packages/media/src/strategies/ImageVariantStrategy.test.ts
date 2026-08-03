import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { IMAGE_VARIANT_PROMPT } from '../prompts/imageVariantPrompt.js';
import { ImageVariantStrategy } from './ImageVariantStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(IMAGE_VARIANT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };
const VALID_RESPONSE = JSON.stringify({ variantDescriptions: ['A blue variant', 'A green variant'] });

describe('ImageVariantStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new ImageVariantStrategy(makePrompts());
    expect(strategy.name).toBe('media-image-variant');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses variantDescriptions into an array of MediaAssetResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageVariantStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'A logo mark', source: SOURCE } },
      makeContext(provider)
    );

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]?.assetUrl).toContain('data:text/plain,');
    expect(result.variants[0]?.mimeType).toBe('image/png');
  });

  it('includes variantCount in the rendered prompt when supplied', async () => {
    let seenPrompt = '';
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt.content;
        return { content: VALID_RESPONSE };
      },
    };
    const strategy = new ImageVariantStrategy(makePrompts());

    await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', source: SOURCE, variantCount: 4 } },
      makeContext(provider)
    );

    expect(seenPrompt).toContain('exactly 4 variant');
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new ImageVariantStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when variantDescriptions is empty', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() { return { content: JSON.stringify({ variantDescriptions: [] }) }; },
    };
    const strategy = new ImageVariantStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { brief: 'x', source: SOURCE } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
