import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentGenerateEngine } from './ContentGenerateEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentGenerateEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentGenerateEngine();
    expect(engine.id).toBe('content.generate');
    expect(engine.name).toBe('Content Generate');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('generates content for a valid topic via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentGenerateEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.generate', input: { topic: 'AI in healthcare' } })
    );

    expect(result.content).toContain('AI in healthcare');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentGenerateEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentGenerateEngine();
    const input = { topic: 'shared topic' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.generate', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.generate', input }));

    expect(resultA.content.startsWith('A:')).toBe(true);
    expect(resultB.content.startsWith('B:')).toBe(true);
  });
});
