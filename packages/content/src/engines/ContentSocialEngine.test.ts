import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentSocialEngine } from './ContentSocialEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentSocialEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentSocialEngine();
    expect(engine.id).toBe('content.social');
    expect(engine.name).toBe('Content Social');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates a social post for a valid topic via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"content": "post"}' }; } };
    const engine = new ContentSocialEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.social', input: { topic: 'launch' } })
    );

    expect(result).toEqual({ content: 'post' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentSocialEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});
