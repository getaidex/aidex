import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignLayoutEngine } from './DesignLayoutEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A hero section with headline left, image right' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignLayoutEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignLayoutEngine();
    expect(engine.id).toBe('design.layout');
    expect(engine.name).toBe('Design Layout');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a layout via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignLayoutEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.layout', input: { brief: 'Landing page hero' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignLayoutEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});
