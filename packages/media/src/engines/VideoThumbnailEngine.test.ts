import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { VideoThumbnailEngine } from './VideoThumbnailEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A frame showing the product' });
const SOURCE = { url: 'https://x.test/a.mp4', mimeType: 'video/mp4' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('VideoThumbnailEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new VideoThumbnailEngine();
    expect(engine.id).toBe('media.video.thumbnail');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoThumbnailEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }));

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('rejects a request with no source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new VideoThumbnailEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
