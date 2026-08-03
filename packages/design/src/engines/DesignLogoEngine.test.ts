import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignLogoEngine } from './DesignLogoEngine.js';

const VALID_RESPONSE = JSON.stringify({ primaryDescription: 'A bold mark' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignLogoEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignLogoEngine();
    expect(engine.id).toBe('design.logo');
    expect(engine.name).toBe('Design Logo');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a logo via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignLogoEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.logo', input: { brief: 'Studio logo' } })
    );

    expect(result.primary.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignLogoEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDesignEngineInputError
    );
  });
});
