import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { AUDIO_GENERATE_PROMPT } from '../prompts/audioGeneratePrompt.js';
import { AudioGenerateStrategy } from './AudioGenerateStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(AUDIO_GENERATE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const VALID_RESPONSE = JSON.stringify({ description: 'A calm ambient loop with soft piano' });

describe('AudioGenerateStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new AudioGenerateStrategy(makePrompts());
    expect(strategy.name).toBe('media-audio-generate');
    expect(strategy.version).toBe('1.0.0');
  });

  it('parses a valid JSON response into AudioGenerateResult', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'A calm ambient loop' } },
      makeContext(provider)
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('respects an explicit outputFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioGenerateStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { brief: 'x', outputFormat: 'wav' } },
      makeContext(provider)
    );

    expect(result.mimeType).toBe('audio/wav');
  });

  it('rejects a missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError for invalid JSON', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: 'not json' }; } };
    const strategy = new AudioGenerateStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { brief: 'x' } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
