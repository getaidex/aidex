import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignBrandEngine } from './DesignBrandEngine.js';

const VALID_RESPONSE = JSON.stringify({
  logoDescription: 'A minimalist mark',
  palette: ['#000000'],
  typography: ['Inter'],
});

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignBrandEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignBrandEngine();
    expect(engine.id).toBe('design.brand');
    expect(engine.name).toBe('Design Brand');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a brand identity via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBrandEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.brand', input: { brief: 'Coffee shop brand' } })
    );

    expect(result.logo.assetUrl).toContain('data:text/plain,');
    expect(result.palette).toEqual(['#000000']);
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBrandEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate() { return { content: VALID_RESPONSE }; } };
    const providerB: Provider = { name: 'b', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBrandEngine();
    const input = { brief: 'shared brief' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'design.brand', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'design.brand', input }));

    expect(resultA).toEqual(resultB);
  });
});
