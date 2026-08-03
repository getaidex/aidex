import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { VideoGenerateEngine } from './VideoGenerateEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A 15-second product teaser' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('VideoGenerateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new VideoGenerateEngine();
    expect(engine.id).toBe('media.video.generate');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a video spec via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoGenerateEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'A product teaser' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('video/mp4');
  });

  it('rejects a request missing brief', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoGenerateEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
