import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignBannerEngine } from './DesignBannerEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A wide web banner with a bold sale headline' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignBannerEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignBannerEngine();
    expect(engine.id).toBe('design.banner');
    expect(engine.name).toBe('Design Banner');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a banner via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBannerEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.banner', input: { brief: 'Sale web banner', platform: 'web' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignBannerEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});
