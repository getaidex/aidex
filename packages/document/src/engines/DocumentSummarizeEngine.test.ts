import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { DocumentSummarizeEngine } from './DocumentSummarizeEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('DocumentSummarizeEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new DocumentSummarizeEngine();
    expect(engine.id).toBe('document.summarize');
    expect(engine.name).toBe('Document Summarize');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('summarizes a valid text document via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new DocumentSummarizeEngine();

    const result = await engine.execute(
      makeContext(provider, {
        strategy: 'document.summarize',
        input: { source: { content: 'A long story.', mimeType: 'text/plain' } },
      })
    );

    expect(result.summary).toContain('A long story.');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new DocumentSummarizeEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidDocumentEngineInputError
    );
  });

  it('rejects a request missing source', async () => {
    const provider = new StubProvider();
    const engine = new DocumentSummarizeEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: 'document.summarize', input: {} }))
    ).rejects.toBeInstanceOf(InvalidDocumentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = {
      name: 'a',
      async generate(prompt) {
        return { content: `A:${prompt.content}` };
      },
    };
    const providerB: Provider = {
      name: 'b',
      async generate(prompt) {
        return { content: `B:${prompt.content}` };
      },
    };
    const engine = new DocumentSummarizeEngine();
    const input = { source: { content: 'shared text', mimeType: 'text/plain' } };

    const resultA = await engine.execute(
      makeContext(providerA, { strategy: 'document.summarize', input })
    );
    const resultB = await engine.execute(
      makeContext(providerB, { strategy: 'document.summarize', input })
    );

    expect(resultA.summary.startsWith('A:')).toBe(true);
    expect(resultB.summary.startsWith('B:')).toBe(true);
  });

  it('records observability events when configured, reusing the same engine instance across calls', async () => {
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        return { content: 'ok', metadata: { usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } } };
      },
    };
    const observability = new ObservabilityBus();
    const engine = new DocumentSummarizeEngine({ observability });
    const input = { source: { content: 'text', mimeType: 'text/plain' } };

    await engine.execute(makeContext(provider, { strategy: 'document.summarize', input }));
    await engine.execute(makeContext(provider, { strategy: 'document.summarize', input }));

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'tokens', 'provider', 'duration', 'tokens']);
  });
});
