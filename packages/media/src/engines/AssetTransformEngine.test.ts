import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { AssetTransformEngine } from './AssetTransformEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'Converted to black and white' });
const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AssetTransformEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AssetTransformEngine();
    expect(engine.id).toBe('media.asset.transform');
    expect(engine.version).toBe('1.0.0');
  });

  it('transforms an asset via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AssetTransformEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'Make it black and white', source: SOURCE } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe(SOURCE.mimeType);
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AssetTransformEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { brief: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
