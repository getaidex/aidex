import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentExpandEngine } from './ContentExpandEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentExpandEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentExpandEngine();
    expect(engine.id).toBe('content.expand');
    expect(engine.name).toBe('Content Expand');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('expands valid content via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentExpandEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.expand', input: { content: 'Some text.' } })
    );

    expect(result.expandedContent).toContain('Some text.');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentExpandEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentExpandEngine();
    const input = { content: 'shared text' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.expand', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.expand', input }));

    expect(resultA.expandedContent.startsWith('A:')).toBe(true);
    expect(resultB.expandedContent.startsWith('B:')).toBe(true);
  });
});
