import type { ExecutionContext, Provider } from '@aidex/core';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { StubStrategy } from './StubStrategy.js';

function makeContext(provider: Provider): ExecutionContext {
  return {
    config: { provider },
    provider,
  };
}

describe('StubStrategy', () => {
  it('exposes its name and version', () => {
    const strategy = new StubStrategy();
    expect(strategy.name).toBe('stub');
    expect(strategy.version).toBe('1.0.0');
  });

  it('builds a Prompt from request.input and calls context.provider.generate()', async () => {
    const provider = new StubProvider();
    const strategy = new StubStrategy();

    const result = await strategy.execute({ strategy: 'stub', input: 'hello' }, makeContext(provider));

    // StubProvider deterministically prefixes content with "stub:" — proves
    // the Prompt actually reached context.provider.generate().
    expect(result).toBe('stub:hello');
  });

  it('falls back to an empty string when request.input is missing', async () => {
    const provider = new StubProvider();
    const strategy = new StubStrategy();

    const result = await strategy.execute({ strategy: 'stub' }, makeContext(provider));

    expect(result).toBe('stub:');
  });

  it('is deterministic: identical requests against the same provider yield identical results', async () => {
    const provider = new StubProvider();
    const strategy = new StubStrategy();
    const request = { strategy: 'stub', input: 'repeat me' };

    const first = await strategy.execute(request, makeContext(provider));
    const second = await strategy.execute(request, makeContext(provider));

    expect(first).toBe(second);
  });

  it('reads context.provider rather than constructing a Provider itself', async () => {
    let calls = 0;
    const provider: Provider = {
      name: 'inline-stub',
      async generate(prompt) {
        calls += 1;
        return { content: `inline:${prompt.content}` };
      },
    };
    const strategy = new StubStrategy();

    const result = await strategy.execute({ strategy: 'stub', input: 'x' }, makeContext(provider));

    expect(calls).toBe(1);
    expect(result).toBe('inline:x');
  });

  it('forwards request.options to context.provider.generate()', async () => {
    let seenOptions: unknown;
    const provider: Provider = {
      name: 'inline-stub',
      async generate(prompt, options) {
        seenOptions = options;
        return { content: prompt.content };
      },
    };
    const strategy = new StubStrategy();

    await strategy.execute(
      { strategy: 'stub', input: 'x', options: { debug: true } },
      makeContext(provider)
    );

    expect(seenOptions).toEqual({ debug: true });
  });
});
