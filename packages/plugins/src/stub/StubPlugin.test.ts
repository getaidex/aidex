import type { ExecutionContext, Provider } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import { StubPlugin } from './StubPlugin.js';

function makeContext(): ExecutionContext {
  const provider: Provider = {
    name: 'inline-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  };
  return { config: { provider }, provider };
}

describe('StubPlugin', () => {
  it('exposes its name', () => {
    const plugin = new StubPlugin();
    expect(plugin.name).toBe('stub');
  });

  it('records onBoot', () => {
    const plugin = new StubPlugin();
    plugin.onBoot(makeContext());
    expect(plugin.calls).toEqual(['onBoot']);
  });

  it('records onReady', () => {
    const plugin = new StubPlugin();
    plugin.onReady(makeContext());
    expect(plugin.calls).toEqual(['onReady']);
  });

  it('records beforeExecute', () => {
    const plugin = new StubPlugin();
    plugin.beforeExecute(makeContext());
    expect(plugin.calls).toEqual(['beforeExecute']);
  });

  it('records afterExecute', () => {
    const plugin = new StubPlugin();
    plugin.afterExecute(makeContext());
    expect(plugin.calls).toEqual(['afterExecute']);
  });

  it('records onShutdown', () => {
    const plugin = new StubPlugin();
    plugin.onShutdown(makeContext());
    expect(plugin.calls).toEqual(['onShutdown']);
  });

  it('records every hook, in call order, across a full lifecycle sequence', () => {
    const plugin = new StubPlugin();
    const context = makeContext();

    plugin.onBoot(context);
    plugin.onReady(context);
    plugin.beforeExecute(context);
    plugin.afterExecute(context);
    plugin.onShutdown(context);

    expect(plugin.calls).toEqual(['onBoot', 'onReady', 'beforeExecute', 'afterExecute', 'onShutdown']);
  });
});
