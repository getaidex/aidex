import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignGenerateEngine } from './DesignGenerateEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A warm, minimalist product hero shot' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignGenerateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignGenerateEngine();
    expect(engine.id).toBe('design.generate');
    expect(engine.name).toBe('Design Generate');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a design asset via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignGenerateEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.generate', input: { brief: 'A minimalist studio brand' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignGenerateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});
