import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidMediaEngineInputError } from '../errors/InvalidMediaEngineInputError.js';
import { ImageGenerateEngine } from './ImageGenerateEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A minimalist product shot' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ImageGenerateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ImageGenerateEngine();
    expect(engine.id).toBe('media.image.generate');
    expect(engine.name).toBeTruthy();
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates an image spec via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageGenerateEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: engine.id, input: { brief: 'A red bicycle' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
    expect(result.mimeType).toBe('image/png');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageGenerateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidMediaEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate() { return { content: VALID_RESPONSE }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new ImageGenerateEngine();
    const input = { brief: 'shared brief' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: engine.id, input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: engine.id, input }));

    expect(resultA).toEqual(resultB);
  });
});
