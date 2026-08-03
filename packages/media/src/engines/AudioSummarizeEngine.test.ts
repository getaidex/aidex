import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { AudioSummarizeEngine } from './AudioSummarizeEngine.js';

const VALID_RESPONSE = JSON.stringify({ summary: 'A placeholder summary' });
const SOURCE = { url: 'https://x.test/a.mp3', mimeType: 'audio/mpeg' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AudioSummarizeEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AudioSummarizeEngine();
    expect(engine.id).toBe('media.audio.summarize');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioSummarizeEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }));

    expect(result.summary).toBe('A placeholder summary');
  });

  it('rejects a request with no source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioSummarizeEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
