import type { ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { InvalidStrategyInputError } from '../errors/InvalidStrategyInputError.js';
import { TextGenerationStrategy } from './TextGenerationStrategy.js';

function makeContext(provider: Provider): ExecutionContext {
  return {
    config: { provider },
    provider,
  };
}

describe('TextGenerationStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new TextGenerationStrategy();
    expect(strategy.name).toBe('text-generation');
    expect(strategy.version).toBe('1.0.0');
  });

  it('builds a Prompt from request.input and returns generated text via StubProvider', async () => {
    const provider = new StubProvider();
    const strategy = new TextGenerationStrategy();

    const result = await strategy.execute(
      { strategy: 'text-generation', input: 'why is the sky blue?' },
      makeContext(provider)
    );

    expect(result).toBe('stub:why is the sky blue?');
  });

  it('rejects a missing request.input', async () => {
    const provider = new StubProvider();
    const strategy = new TextGenerationStrategy();

    await expect(
      strategy.execute({ strategy: 'text-generation' }, makeContext(provider))
    ).rejects.toThrow('non-empty string');
  });

  it('rejects an empty string request.input', async () => {
    const provider = new StubProvider();
    const strategy = new TextGenerationStrategy();

    await expect(
      strategy.execute({ strategy: 'text-generation', input: '' }, makeContext(provider))
    ).rejects.toThrow('non-empty string');
  });

  it('rejects a non-string request.input', async () => {
    const provider = new StubProvider();
    const strategy = new TextGenerationStrategy();

    await expect(
      strategy.execute({ strategy: 'text-generation', input: 42 }, makeContext(provider))
    ).rejects.toThrow('non-empty string');
  });

  it('rejects invalid input with an InvalidStrategyInputError specifically', async () => {
    const provider = new StubProvider();
    const strategy = new TextGenerationStrategy();

    await expect(
      strategy.execute({ strategy: 'text-generation', input: '' }, makeContext(provider))
    ).rejects.toBeInstanceOf(InvalidStrategyInputError);
  });

  it('passes request.input as the Prompt content, unchanged', async () => {
    let seenPrompt: unknown;
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt;
        return { content: 'ok' };
      },
    };
    const strategy = new TextGenerationStrategy();

    await strategy.execute(
      { strategy: 'text-generation', input: 'exact text' },
      makeContext(provider)
    );

    expect(seenPrompt).toMatchObject({ content: 'exact text' });
  });

  it('carries request.metadata onto the Prompt', async () => {
    let seenPrompt: unknown;
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt;
        return { content: 'ok' };
      },
    };
    const strategy = new TextGenerationStrategy();

    await strategy.execute(
      { strategy: 'text-generation', input: 'hi', metadata: { traceId: 'abc' } },
      makeContext(provider)
    );

    expect(seenPrompt).toMatchObject({ metadata: { traceId: 'abc' } });
  });

  it('forwards request.options to context.provider.generate()', async () => {
    let seenOptions: unknown;
    const provider: Provider = {
      name: 'inline',
      async generate(_prompt, options) {
        seenOptions = options;
        return { content: 'ok' };
      },
    };
    const strategy = new TextGenerationStrategy();

    await strategy.execute(
      { strategy: 'text-generation', input: 'hi', options: { timeout: 100 } },
      makeContext(provider)
    );

    expect(seenOptions).toEqual({ timeout: 100 });
  });

  it('returns response.content only, discarding raw/metadata from the ProviderResponse', async () => {
    const provider: Provider = {
      name: 'inline',
      async generate() {
        return { content: 'final answer', raw: { anything: true }, metadata: { model: 'x' } };
      },
    };
    const strategy = new TextGenerationStrategy();

    const result = await strategy.execute(
      { strategy: 'text-generation', input: 'hi' },
      makeContext(provider)
    );

    expect(result).toBe('final answer');
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
    const strategy = new TextGenerationStrategy();
    const request = { strategy: 'text-generation', input: 'same input' };

    const resultA = await strategy.execute(request, makeContext(providerA));
    const resultB = await strategy.execute(request, makeContext(providerB));

    expect(resultA).toBe('A:same input');
    expect(resultB).toBe('B:same input');
  });

  it('propagates a rejected provider call without catching it', async () => {
    const providerError = new Error('provider exploded');
    const provider: Provider = {
      name: 'inline',
      async generate() {
        throw providerError;
      },
    };
    const strategy = new TextGenerationStrategy();

    await expect(
      strategy.execute({ strategy: 'text-generation', input: 'hi' }, makeContext(provider))
    ).rejects.toBe(providerError);
  });

  it('merges request.executionId into the Prompt metadata alongside request.metadata', async () => {
    let seenPrompt: unknown;
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt;
        return { content: 'ok' };
      },
    };
    const strategy = new TextGenerationStrategy();

    await strategy.execute(
      {
        strategy: 'text-generation',
        input: 'hi',
        metadata: { traceId: 'abc' },
        executionId: 'exec-123',
      },
      makeContext(provider)
    );

    expect(seenPrompt).toMatchObject({
      metadata: { traceId: 'abc', executionId: 'exec-123' },
    });
  });

  it('omits executionId from Prompt metadata when the request has none', async () => {
    let seenPrompt: unknown;
    const provider: Provider = {
      name: 'inline',
      async generate(prompt) {
        seenPrompt = prompt;
        return { content: 'ok' };
      },
    };
    const strategy = new TextGenerationStrategy();

    await strategy.execute({ strategy: 'text-generation', input: 'hi' }, makeContext(provider));

    expect((seenPrompt as { metadata?: { executionId?: string } }).metadata?.executionId).toBeUndefined();
  });
});
