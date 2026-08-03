import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { ObservabilityBus } from '@aidex/observability';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidContentEngineInputError } from '../errors/InvalidContentEngineInputError.js';
import { ContentRewriteEngine } from './ContentRewriteEngine.js';

function makeContext(provider: Provider, request?: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

describe('ContentRewriteEngine', () => {
  it('exposes id/name/description/version', () => {
    const engine = new ContentRewriteEngine();
    expect(engine.id).toBe('content.rewrite');
    expect(engine.name).toBe('Content Rewrite');
    expect(engine.description).toBeTruthy();
    expect(engine.version).toBe('1.0.0');
  });

  it('rewrites valid content via the configured provider', async () => {
    const provider = new StubProvider();
    const engine = new ContentRewriteEngine();

    const result = await engine.execute(
      makeContext(provider, { strategy: 'content.rewrite', input: { content: 'Some text.' } })
    );

    expect(result.rewrittenContent).toContain('Some text.');
  });

  it('rejects a request with no input at all', async () => {
    const provider = new StubProvider();
    const engine = new ContentRewriteEngine();

    await expect(engine.execute(makeContext(provider))).rejects.toBeInstanceOf(
      InvalidContentEngineInputError
    );
  });

  it('rejects a missing content field', async () => {
    const provider = new StubProvider();
    const engine = new ContentRewriteEngine();

    await expect(
      engine.execute(makeContext(provider, { strategy: 'content.rewrite', input: {} }))
    ).rejects.toBeInstanceOf(InvalidContentEngineInputError);
  });

  it('works unchanged against a second, differently-shaped Provider (provider independence)', async () => {
    const providerA: Provider = { name: 'a', async generate(prompt) { return { content: `A:${prompt.content}` }; } };
    const providerB: Provider = { name: 'b', async generate(prompt) { return { content: `B:${prompt.content}` }; } };
    const engine = new ContentRewriteEngine();
    const input = { content: 'shared text' };

    const resultA = await engine.execute(makeContext(providerA, { strategy: 'content.rewrite', input }));
    const resultB = await engine.execute(makeContext(providerB, { strategy: 'content.rewrite', input }));

    expect(resultA.rewrittenContent.startsWith('A:')).toBe(true);
    expect(resultB.rewrittenContent.startsWith('B:')).toBe(true);
  });

  it('records observability events when configured, reusing the same engine instance across calls', async () => {
    const provider: Provider = {
      name: 'test-provider',
      async generate() {
        return { content: 'ok', metadata: { usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 } } };
      },
    };
    const observability = new ObservabilityBus();
    const engine = new ContentRewriteEngine({ observability });
    const input = { content: 'text' };

    await engine.execute(makeContext(provider, { strategy: 'content.rewrite', input }));
    await engine.execute(makeContext(provider, { strategy: 'content.rewrite', input }));

    const events = observability.getTimeline().map((e) => e.event);
    expect(events).toEqual(['provider', 'duration', 'tokens', 'provider', 'duration', 'tokens']);
  });
});
