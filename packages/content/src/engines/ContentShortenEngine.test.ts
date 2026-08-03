import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentShortenEngine } from './ContentShortenEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentShortenEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentShortenEngine();
    expect(engine.id).toBe('content.shorten');
    expect(engine.name).toBe('Content Shorten');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('shortens valid content via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentShortenEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.shorten', input: { content: 'Some text.' } })
    );

    expect(result.shortenedContent).toContain('Some text.');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentShortenEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentShortenEngine();
    const input = { content: 'shared text' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.shorten', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.shorten', input }));

    expect(resultA.shortenedContent.startsWith('A:')).toBe(true);
    expect(resultB.shortenedContent.startsWith('B:')).toBe(true);
  });
});
