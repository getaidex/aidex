import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentTaglineEngine } from './ContentTaglineEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentTaglineEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentTaglineEngine();
    expect(engine.id).toBe('content.tagline');
    expect(engine.name).toBe('Content Tagline');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates taglines for a valid brandName via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"taglines": ["A"]}' }; } };
    const engine = new ContentTaglineEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.tagline', input: { brandName: 'Acme' } })
    );

    expect(result).toEqual({ taglines: ['A'] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentTaglineEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});
