import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentSeoEngine } from './ContentSeoEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentSeoEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentSeoEngine();
    expect(engine.id).toBe('content.seo');
    expect(engine.name).toBe('Content SEO');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('optimizes valid content via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"optimizedContent": "opt"}' }; } };
    const engine = new ContentSeoEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.seo', input: { content: 'text' } })
    );

    expect(result).toEqual({ optimizedContent: 'opt' });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentSeoEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});
