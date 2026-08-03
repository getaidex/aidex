import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentHeadlineEngine } from './ContentHeadlineEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentHeadlineEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentHeadlineEngine();
    expect(engine.id).toBe('content.headline');
    expect(engine.name).toBe('Content Headline');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates headlines for a valid topic via the configured provider', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{"headlines": ["A"]}' }; } };
    const engine = new ContentHeadlineEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.headline', input: { topic: 'launch' } })
    );

    expect(result).toEqual({ headlines: ['A'] });
  });

  it('rejects a request with no input at all', async () => {
    const provider: Provider = { name: 'inline', async generate() { return { content: '{}' }; } };
    const engine = new ContentHeadlineEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });
});
