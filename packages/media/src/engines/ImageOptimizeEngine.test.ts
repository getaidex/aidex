import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { ImageOptimizeEngine } from './ImageOptimizeEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'Recompressed at 80% quality' });
const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ImageOptimizeEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ImageOptimizeEngine();
    expect(engine.id).toBe('media.image.optimize');
    expect(engine.version).toBe('1.0.0');
  });

  it('has no brief requirement — source alone is enough', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageOptimizeEngine();

    const result = await engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }));

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageOptimizeEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: {} }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
