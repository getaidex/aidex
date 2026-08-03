import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { ImageVariantEngine } from './ImageVariantEngine.js';

const VALID_RESPONSE = JSON.stringify({ variantDescriptions: ['A blue variant', 'A green variant'] });
const SOURCE = { url: 'https://x.test/a.png', mimeType: 'image/png' };

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ImageVariantEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ImageVariantEngine();
    expect(engine.id).toBe('media.image.variant');
    expect(engine.version).toBe('1.0.0');
  });

  it('generates variants via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageVariantEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'A logo mark', source: SOURCE } })
    );

    expect(result.variants).toHaveLength(2);
  });

  it('rejects a request missing source', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageVariantEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: engine.id, input: { brief: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });
});
