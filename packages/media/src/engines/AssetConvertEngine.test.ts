import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { AssetConvertEngine } from './AssetConvertEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'Converted to PDF' });
const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('AssetConvertEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new AssetConvertEngine();
    expect(engine.id).toBe('media.asset.convert');
    expect(engine.version).toBe('1.0.0');
  });

  it('converts an asset via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AssetConvertEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { source: SOURCE, targetFormat: 'pdf' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('rejects a request missing targetFormat', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new AssetConvertEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { source: SOURCE } }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
