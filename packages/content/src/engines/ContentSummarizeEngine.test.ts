import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentSummarizeEngine } from './ContentSummarizeEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentSummarizeEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentSummarizeEngine();
    expect(engine.id).toBe('content.summarize');
    expect(engine.name).toBe('Content Summarize');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('summarizes valid content via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentSummarizeEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.summarize', input: { content: 'Some text.' } })
    );

    expect(result.summary).toContain('Some text.');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentSummarizeEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentSummarizeEngine();
    const input = { content: 'shared text' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.summarize', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.summarize', input }));

    expect(resultA.summary.startsWith('A:')).toBe(true);
    expect(resultB.summary.startsWith('B:')).toBe(true);
  });
});
