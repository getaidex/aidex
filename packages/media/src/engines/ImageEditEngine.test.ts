import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { ImageEditEngine } from './ImageEditEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'The background has been removed' });
const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ImageEditEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ImageEditEngine();
    expect(engine.id).toBe('media.image.edit');
    expect(engine.version).toBe('1.0.0');
  });

  it('edits an image via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageEditEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Remove the background', source: SOURCE } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageEditEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { brief: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
