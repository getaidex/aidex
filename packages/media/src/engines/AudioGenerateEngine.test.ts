import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { AudioGenerateEngine } from './AudioGenerateEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A calm ambient loop' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AudioGenerateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AudioGenerateEngine();
    expect(engine.id).toBe('media.audio.generate');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates an audio spec via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioGenerateEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'A calm ambient loop' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('audio/mpeg');
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AudioGenerateEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
