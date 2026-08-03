import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentToneEngine } from './ContentToneEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentToneEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentToneEngine();
    expect(engine.id).toBe('content.tone');
    expect(engine.name).toBe('Content Tone');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('adjusts tone of valid content via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentToneEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.tone', input: { content: 'Hi there', tone: 'formal' } })
    );

    expect(result.content).toContain('Hi there');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentToneEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('rejects a missing tone', async () => {
    const provider = new StubProvider();
    const engine = new ContentToneEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: 'content.tone', input: { content: 'x' } }))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentToneEngine();
    const input = { content: 'shared text', tone: 'formal' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.tone', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.tone', input }));

    expect(resultA.content.startsWith('A:')).toBe(true);
    expect(resultB.content.startsWith('B:')).toBe(true);
  });
});
