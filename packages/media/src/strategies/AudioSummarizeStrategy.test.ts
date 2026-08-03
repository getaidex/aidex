import type { ExecutionContext, Provider } from '@aidex/core';
import { PromptRegistry } from '@aidex/prompts';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { AUDIO_SUMMARIZE_PROMPT } from '../prompts/audioSummarizePrompt.js';
import { AudioSummarizeStrategy } from './AudioSummarizeStrategy.js';

function makePrompts(): PromptRegistry {
  const prompts = new PromptRegistry();
  prompts.register(AUDIO_SUMMARIZE_PROMPT);
  return prompts;
}

function makeContext(provider: Provider): ExecutionContext {
  return { config: { provider }, provider };
}

const SOURCE = { url: 'https://x.test/a.mp3', mimeType: 'audio/mpeg' };
const VALID_RESPONSE = JSON.stringify({ summary: 'A placeholder summary of the audio content' });

describe('AudioSummarizeStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new AudioSummarizeStrategy(makePrompts());
    expect(strategy.name).toBe('media-audio-summarize');
    expect(strategy.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioSummarizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE } },
      makeContext(provider)
    );

    expect(result.summary).toBe('A placeholder summary of the audio content');
  });

  it('truncates the summary to maxLength, defensively (not just requested in the prompt)', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioSummarizeStrategy(makePrompts());

    const result = await strategy.execute(
      { strategy: strategy.name, input: { source: SOURCE, maxLength: 10 } },
      makeContext(provider)
    );

    expect(result.summary.length).toBeLessThanOrEqual(10);
  });

  it('rejects a missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const strategy = new AudioSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: {} }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('throws UnparsableProviderResponseError when summary is missing', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const strategy = new AudioSummarizeStrategy(makePrompts());

    await expect(
      strategy.execute({ strategy: strategy.name, input: { source: SOURCE } }, makeContext(provider))
    ).rejects.toBeInstanceOf(UnparsableProviderResponseError);
  });
});
