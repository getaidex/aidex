import type { AidexRequest, ExecutionContext, ILogger, Provider } from '@aidex/core';
import { describe, expect, it, vi } from 'vitest';
import { LoggerPlugin } from './LoggerPlugin.js';

function makeLogger(): ILogger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  const provider: Provider = {
    name: 'inline-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  };
  return { config: { provider }, provider, ...overrides };
}

describe('LoggerPlugin', () => {
  it('exposes its name', () => {
    const plugin = new LoggerPlugin();
    expect(plugin.name).toBe('logger');
  });

  it('logs on boot via context.logger', () => {
    const logger = makeLogger();
    new LoggerPlugin().onBoot(makeContext({ logger }));
    expect(logger.info).toHaveBeenCalledWith('[logger] boot');
  });

  it('logs on ready via context.logger', () => {
    const logger = makeLogger();
    new LoggerPlugin().onReady(makeContext({ logger }));
    expect(logger.info).toHaveBeenCalledWith('[logger] ready');
  });

  it('logs on beforeExecute via context.logger, including the request strategy name', () => {
    const logger = makeLogger();
    const request: AidexRequest = { strategy: 'summarize' };
    new LoggerPlugin().beforeExecute(makeContext({ logger, request }));
    expect(logger.info).toHaveBeenCalledWith('[logger] beforeExecute', 'summarize');
  });

  it('logs on afterExecute via context.logger, including the request strategy name', () => {
    const logger = makeLogger();
    const request: AidexRequest = { strategy: 'summarize' };
    new LoggerPlugin().afterExecute(makeContext({ logger, request }));
    expect(logger.info).toHaveBeenCalledWith('[logger] afterExecute', 'summarize');
  });

  it('logs on shutdown via context.logger', () => {
    const logger = makeLogger();
    new LoggerPlugin().onShutdown(makeContext({ logger }));
    expect(logger.info).toHaveBeenCalledWith('[logger] shutdown');
  });

  it('exercises every hook against a real logger in one lifecycle sequence', () => {
    const logger = makeLogger();
    const plugin = new LoggerPlugin();
    const context = makeContext({ logger, request: { strategy: 'echo' } });

    plugin.onBoot(context);
    plugin.onReady(context);
    plugin.beforeExecute(context);
    plugin.afterExecute(context);
    plugin.onShutdown(context);

    expect(logger.info).toHaveBeenCalledTimes(5);
  });

  describe('without a logger configured', () => {
    it('safely no-ops on every hook instead of throwing', () => {
      const plugin = new LoggerPlugin();
      const context = makeContext({ request: { strategy: 'echo' } });

      expect(() => plugin.onBoot(context)).not.toThrow();
      expect(() => plugin.onReady(context)).not.toThrow();
      expect(() => plugin.beforeExecute(context)).not.toThrow();
      expect(() => plugin.afterExecute(context)).not.toThrow();
      expect(() => plugin.onShutdown(context)).not.toThrow();
    });
  });
});
