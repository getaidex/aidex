import { describe, expect, it, vi } from 'vitest';
import { Lifecycle } from './Lifecycle.js';
import type { ExecutionContext } from '../../types/ExecutionContext.js';
import type { AidexConfig } from '../configuration/AidexConfig.js';

function makeContext(): ExecutionContext {
  const config: AidexConfig = { provider: { name: 'stub-provider' } as never };
  return { config, provider: config.provider };
}

describe('Lifecycle', () => {
  it('invokes handlers registered for the emitted phase, in registration order', async () => {
    const lifecycle = new Lifecycle();
    const calls: string[] = [];
    lifecycle.on('boot', () => {
      calls.push('first');
    });
    lifecycle.on('boot', () => {
      calls.push('second');
    });

    await lifecycle.emit('boot', makeContext());

    expect(calls).toEqual(['first', 'second']);
  });

  it('awaits each handler before starting the next, preserving registration order even when a later handler resolves faster', async () => {
    const lifecycle = new Lifecycle();
    const order: string[] = [];
    lifecycle.on('ready', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push('first');
    });
    lifecycle.on('ready', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      order.push('second');
    });

    await lifecycle.emit('ready', makeContext());

    expect(order).toEqual(['first', 'second']);
  });

  it('awaits async handlers before resolving', async () => {
    const lifecycle = new Lifecycle();
    const order: string[] = [];
    lifecycle.on('ready', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      order.push('async-handler-completed');
    });

    await lifecycle.emit('ready', makeContext());

    expect(order).toEqual(['async-handler-completed']);
  });

  it('does not invoke handlers registered for a different phase', async () => {
    const lifecycle = new Lifecycle();
    const bootHandler = vi.fn();
    lifecycle.on('boot', bootHandler);

    await lifecycle.emit('ready', makeContext());

    expect(bootHandler).not.toHaveBeenCalled();
  });

  it('does nothing when a phase has no handlers', async () => {
    const lifecycle = new Lifecycle();

    await expect(lifecycle.emit('shutdown', makeContext())).resolves.toBeUndefined();
  });
});
