import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidDesignEngineInputError } from '../errors/InvalidDesignEngineInputError.js';
import { DesignPosterEngine } from './DesignPosterEngine.js';

const VALID_RESPONSE = JSON.stringify({ description: 'A bold festival poster with layered typography' });

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DesignPosterEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DesignPosterEngine();
    expect(engine.id).toBe('design.poster');
    expect(engine.name).toBe('Design Poster');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a poster via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPosterEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'design.poster', input: { brief: 'Summer festival poster' } })
    );

    expect(result.assetUrl).toContain('data:text/plain,');
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: VALID_RESPONSE }; } };
    const engine = new DesignPosterEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(InvalidDesignEngineInputError);
  });
});
