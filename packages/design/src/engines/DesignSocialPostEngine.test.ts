import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignSocialPostEngine } from './DesignSocialPostEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A square launch-day graphic with a bold product shot' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignSocialPostEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignSocialPostEngine();
    expect(engine.id).toBe('design.social-post');
    expect(engine.name).toBe('Design Social Post');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a social post via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignSocialPostEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'design.social-post',
        input: { brief: 'Product launch post', platform: 'instagram' },
      })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignSocialPostEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});
