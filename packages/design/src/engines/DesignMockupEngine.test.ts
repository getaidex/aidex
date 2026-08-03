import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignMockupEngine } from './DesignMockupEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'Logo on a mug' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignMockupEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignMockupEngine();
    expect(engine.id).toBe('design.mockup');
    expect(engine.name).toBe('Design Mockup');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a mockup via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignMockupEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.mockup', input: { brief: 'Logo' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignMockupEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});
