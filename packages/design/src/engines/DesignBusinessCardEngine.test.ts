import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignBusinessCardEngine } from './DesignBusinessCardEngine.js';

const VALID_RESPONSE = JSON.stringify({ frontDescription: 'Front' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignBusinessCardEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignBusinessCardEngine();
    expect(engine.id).toBe('design.business-card');
    expect(engine.name).toBe('Design Business Card');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a business card via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBusinessCardEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.business-card', input: { brief: 'Studio card' } })
    );

    expect(result.front.assetUrl).toContain('data:text/plain,');
    expect(result.back).toBeUndefined();
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBusinessCardEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});
