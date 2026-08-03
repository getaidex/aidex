import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { AudioTranscribeEngine } from './AudioTranscribeEngine.js';

const VALID_RESPONSE = JSON.stringify({ text: 'Placeholder transcript text' });
const SOURCE = { url: 'https://x.test/a.mp3', mimeType: 'audio/mpeg' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AudioTranscribeEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AudioTranscribeEngine();
    expect(engine.id).toBe('media.audio.transcribe');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioTranscribeEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }));

    expect(result.text).toBe('Placeholder transcript text');
  });

  it('rejects a request with no source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioTranscribeEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
