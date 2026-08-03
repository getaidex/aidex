import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { VideoEditEngine } from './VideoEditEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'The intro has been trimmed' });
const SOURCE = { url: 'https://x.test/a.mp4', mimeType: 'video/mp4' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('VideoEditEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new VideoEditEngine();
    expect(engine.id).toBe('media.video.edit');
    expect(engine.version).toBe('1.0.0');
  });

  it('edits a video via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoEditEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Trim the intro', source: SOURCE } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoEditEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { brief: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
