import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentProductDescriptionEngine } from './ContentProductDescriptionEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentProductDescriptionEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentProductDescriptionEngine();
    expect(engine.id).toBe('content.product-description');
    expect(engine.name).toBe('Content Product Description');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a description for a valid productName via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentProductDescriptionEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'content.product-description',
        input: { productName: 'Wireless Mouse' },
      })
    );

    expect(result.description).toContain('Wireless Mouse');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentProductDescriptionEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentProductDescriptionEngine();
    const input = { productName: 'shared product' };

    const resultA = await engine.execute(
      makeContext(providerA, { strategy: 'content.product-description', input })
    );
    const resultB = await engine.execute(
      makeContext(providerB, { strategy: 'content.product-description', input })
    );

    expect(resultA.description.startsWith('A:')).toBe(true);
    expect(resultB.description.startsWith('B:')).toBe(true);
  });
});
