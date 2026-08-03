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
});
