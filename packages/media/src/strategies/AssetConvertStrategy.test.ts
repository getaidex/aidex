import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { ASSET_CONVERT_PROMPT } from '../prompts/assetConvertPrompt.js';
import { AssetConvertStrategy } from './AssetConvertStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(ASSET_CONVERT_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };
const VALID_RESPONSE = JSON.stringify({ description: 'Converted to PDF via a rasterized single page' });

describe('AssetConvertStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new AssetConvertStrategy(makePrompts());
    expect(strategy.name).toBe('media-asset-convert');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into AssetConvertResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AssetConvertStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'pdf' } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects a missing targetFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AssetConvertStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AssetConvertStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { targetFormat: 'pdf' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when description is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new AssetConvertStrategy(makePrompts());

    await expect(
      strategy.execute(
        { strategy: strategy.name, input: { source: SOURCE, targetFormat: 'pdf' } },
        makeContext(provider)
      )
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
