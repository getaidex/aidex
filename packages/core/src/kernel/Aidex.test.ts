import { describe, expect, it, vi } from 'vitest';
import { Aidex } from './Aidex.js';
import { StrategyNotFoundError } from './errors/StrategyNotFoundError.js';
import type { AidexConfig } from './configuration/AidexConfig.js';
import type { Provider } from '../types/Provider.js';
import type { Strategy } from '../types/Strategy.js';
import type { Plugin } from '../types/Plugin.js';

function makeProvider(): Provider {
  return {
    name: 'stub-provider',
    async generate(prompt) {
      return { content: `generated:${prompt.content}` };
    },
  };
}

function makeConfig(overrides: Partial<AidexConfig> = {}): AidexConfig {
  return { provider: makeProvider(), ...overrides };
}

describe('Aidex', () => {
  it('runs ready (never boot) for config.plugins entries during construction', () => {
    const calls: string[] = [];
    const plugin: Plugin = {
      name: 'tracker',
      onBoot: () => {
        calls.push('boot');
      },
      onReady: () => {
        calls.push('ready');
      },
    };

    new Aidex(makeConfig({ plugins: [plugin] }));

    // boot fires before config.plugins are registered, so it always emits to
    // zero listeners — no plugin, from any source, ever observes onBoot.
    // Only ready is observable, per ADR-002.
    expect(calls).toEqual(['ready']);
  });

  it('routes a rejecting onReady hook to the logger instead of crashing (unhandled rejection)', async () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const readyError = new Error('onReady blew up');
    const plugin: Plugin = {
      name: 'flaky',
      onReady: async () => {
        throw readyError;
      },
    };

    new Aidex(makeConfig({ logger, plugins: [plugin] }));

    // The rejection happens asynchronously (after the constructor returns),
    // so flush microtasks before asserting the logger was notified instead
    // of the rejection escaping as unhandled.
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.error).toHaveBeenCalledWith('ready hook failed', readyError);
  });

  it('wires hooks for a plugin registered via use()', () => {
    const calls: string[] = [];
    const aidex = new Aidex(makeConfig());
    aidex.use({
      name: 'tracker',
      onBoot: () => {
        calls.push('boot');
      },
    });

    expect(calls).toEqual([]);
  });

  it('registers a strategy and executes it, wrapping with beforeExecute/afterExecute', async () => {
    const calls: string[] = [];
    const aidex = new Aidex(makeConfig());
    aidex.use({
      name: 'tracker',
      beforeExecute: () => {
        calls.push('before');
      },
      afterExecute: () => {
        calls.push('after');
      },
    });

    const strategy: Strategy<string> = {
      name: 'echo',
      async execute(request) {
        calls.push('execute');
        return `echo:${String(request.input)}`;
      },
    };
    aidex.registerStrategy(strategy);

    const result = await aidex.execute<string>({ strategy: 'echo', input: 'hi' });

    expect(result).toBe('echo:hi');
    expect(calls).toEqual(['before', 'execute', 'after']);
  });

  it('throws StrategyNotFoundError when the strategy is not registered', async () => {
    const aidex = new Aidex(makeConfig());

    await expect(aidex.execute({ strategy: 'missing' })).rejects.toBeInstanceOf(
      StrategyNotFoundError
    );
  });

  it('does not call afterExecute when execute() throws StrategyNotFoundError', async () => {
    const afterExecute = vi.fn();
    const aidex = new Aidex(makeConfig());
    aidex.use({ name: 'tracker', afterExecute });

    await expect(aidex.execute({ strategy: 'missing' })).rejects.toBeInstanceOf(
      StrategyNotFoundError
    );

    expect(afterExecute).toHaveBeenCalledTimes(0);
  });

  it('propagates a strategy execution error without catching, wrapping, or swallowing it', async () => {
    class CustomStrategyError extends Error {}
    const thrown = new CustomStrategyError('boom');
    const aidex = new Aidex(makeConfig());
    aidex.registerStrategy({
      name: 'explode',
      async execute() {
        throw thrown;
      },
    });

    await expect(aidex.execute({ strategy: 'explode' })).rejects.toBe(thrown);
  });

  it('fires beforeExecute/afterExecute during execute() for a plugin supplied via config.plugins', async () => {
    const calls: string[] = [];
    const plugin: Plugin = {
      name: 'tracker',
      beforeExecute: () => {
        calls.push('before');
      },
      afterExecute: () => {
        calls.push('after');
      },
    };
    const aidex = new Aidex(makeConfig({ plugins: [plugin] }));
    aidex.registerStrategy({
      name: 'echo',
      async execute(request) {
        calls.push('execute');
        return `echo:${String(request.input)}`;
      },
    });

    const result = await aidex.execute<string>({ strategy: 'echo', input: 'hi' });

    expect(result).toBe('echo:hi');
    expect(calls).toEqual(['before', 'execute', 'after']);
  });

  it('passes provider, logger, and config through ExecutionContext to the strategy', async () => {
    const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const provider = makeProvider();
    const config = makeConfig({ provider, logger, metadata: { tenant: 'acme' } });
    const aidex = new Aidex(config);

    let seenContext: unknown;
    aidex.registerStrategy({
      name: 'inspect',
      async execute(_request, context) {
        seenContext = context;
        return null;
      },
    });

    await aidex.execute({ strategy: 'inspect' });

    expect(seenContext).toMatchObject({
      config,
      provider,
      logger,
      metadata: { tenant: 'acme' },
      request: { strategy: 'inspect' },
    });
  });

  it('generates an executionId when the request does not supply one, and puts it on context, request, and options', async () => {
    const aidex = new Aidex(makeConfig());
    let seenRequest: unknown;
    let seenContext: unknown;
    aidex.registerStrategy({
      name: 'inspect',
      async execute(request, context) {
        seenRequest = request;
        seenContext = context;
        return null;
      },
    });

    await aidex.execute({ strategy: 'inspect' });

    const request = seenRequest as { executionId?: string; options?: { executionId?: string } };
    const context = seenContext as { executionId?: string };

    expect(typeof request.executionId).toBe('string');
    expect(request.executionId).toHaveLength(36); // UUID
    expect(request.options?.executionId).toBe(request.executionId);
    expect(context.executionId).toBe(request.executionId);
  });

  it('preserves a caller-supplied executionId instead of generating a new one', async () => {
    const aidex = new Aidex(makeConfig());
    let seenRequest: unknown;
    aidex.registerStrategy({
      name: 'inspect',
      async execute(request) {
        seenRequest = request;
        return null;
      },
    });

    await aidex.execute({ strategy: 'inspect', executionId: 'caller-supplied-id' });

    expect((seenRequest as { executionId?: string }).executionId).toBe('caller-supplied-id');
  });

  it('merges a caller-supplied executionId into request.options alongside existing options', async () => {
    const aidex = new Aidex(makeConfig());
    let seenRequest: unknown;
    aidex.registerStrategy({
      name: 'inspect',
      async execute(request) {
        seenRequest = request;
        return null;
      },
    });

    await aidex.execute({
      strategy: 'inspect',
      executionId: 'caller-supplied-id',
      options: { timeout: 100 },
    });

    expect((seenRequest as { options?: unknown }).options).toEqual({
      timeout: 100,
      executionId: 'caller-supplied-id',
    });
  });

  it('does not mutate the original request object passed to execute()', async () => {
    const aidex = new Aidex(makeConfig());
    aidex.registerStrategy({
      name: 'inspect',
      async execute() {
        return null;
      },
    });
    const originalRequest = { strategy: 'inspect' };

    await aidex.execute(originalRequest);

    expect(originalRequest).toEqual({ strategy: 'inspect' });
  });

  it('generates two different executionIds for two separate execute() calls', async () => {
    const aidex = new Aidex(makeConfig());
    const seen: string[] = [];
    aidex.registerStrategy({
      name: 'inspect',
      async execute(request) {
        seen.push((request as { executionId: string }).executionId);
        return null;
      },
    });

    await aidex.execute({ strategy: 'inspect' });
    await aidex.execute({ strategy: 'inspect' });

    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });

  it('passes the auto-generated executionId to StrategyNotFoundError when the caller supplied none', async () => {
    const aidex = new Aidex(makeConfig());

    const rejection = aidex.execute({ strategy: 'missing' });

    try {
      await rejection;
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(StrategyNotFoundError);
      expect(typeof (err as { executionId?: string }).executionId).toBe('string');
      expect((err as { executionId: string }).executionId).toHaveLength(36);
    }
  });
});
