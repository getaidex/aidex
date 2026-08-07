import { describe, expect, it } from 'vitest';
import type { AidexConfig, ExecutionContext } from '@aidex/core';
import { EngineRegistry, type Engine } from '@aidex/engines';
import { EngineHandle } from './EngineHandle.js';

function makeConfig(): AidexConfig {
  return {
    provider: {
      name: 'stub',
      async generate(prompt) {
        return { content: prompt.content };
      },
    },
  };
}

function makeRecordingEngine(
  id: string,
  result: unknown = `ran:${id}`
): { engine: Engine; contexts: ExecutionContext[] } {
  const contexts: ExecutionContext[] = [];
  const engine: Engine = {
    id,
    name: id,
    description: `Test engine "${id}"`,
    version: '1.0.0',
    async execute(context) {
      contexts.push(context);
      return result;
    },
  };
  return { engine, contexts };
}

describe('EngineHandle', () => {
  it('delegates execute() to EngineRegistry.execute() and returns its result', async () => {
    const registry = new EngineRegistry();
    const { engine } = makeRecordingEngine('document.extract', 'extracted');
    registry.register(engine);
    const handle = new EngineHandle(registry, makeConfig(), 'document.extract');

    const result = await handle.execute('some input');

    expect(result).toBe('extracted');
  });

  it('builds an ExecutionContext with config/provider/logger/metadata from the stored config', async () => {
    const registry = new EngineRegistry();
    const { engine, contexts } = makeRecordingEngine('document.extract');
    registry.register(engine);
    const config = makeConfig();
    const handle = new EngineHandle(registry, config, 'document.extract');

    await handle.execute('hello');

    expect(contexts).toHaveLength(1);
    expect(contexts[0].config).toBe(config);
    expect(contexts[0].provider).toBe(config.provider);
    expect(contexts[0].request).toEqual({ strategy: 'document.extract', input: 'hello' });
  });

  it('propagates a rejection from EngineRegistry.execute() without catching it', async () => {
    const registry = new EngineRegistry();
    const handle = new EngineHandle(registry, makeConfig(), 'missing.engine');

    await expect(handle.execute('x')).rejects.toThrow(/not found/i);
  });

  it('works with no input argument, passing input: undefined through', async () => {
    const registry = new EngineRegistry();
    const { engine, contexts } = makeRecordingEngine('document.extract');
    registry.register(engine);
    const handle = new EngineHandle(registry, makeConfig(), 'document.extract');

    await handle.execute();

    expect(contexts[0].request).toEqual({ strategy: 'document.extract', input: undefined });
  });

  it('sets a fresh executionId on the ExecutionContext for every execute() call', async () => {
    const registry = new EngineRegistry();
    const { engine, contexts } = makeRecordingEngine('document.extract');
    registry.register(engine);
    const handle = new EngineHandle(registry, makeConfig(), 'document.extract');

    await handle.execute('first');
    await handle.execute('second');

    expect(contexts).toHaveLength(2);
    expect(typeof contexts[0].executionId).toBe('string');
    expect(contexts[0].executionId).toHaveLength(36);
    expect(contexts[0].executionId).not.toBe(contexts[1].executionId);
  });

  it('does not add executionId onto context.request — request stays exactly { strategy, input }', async () => {
    const registry = new EngineRegistry();
    const { engine, contexts } = makeRecordingEngine('document.extract');
    registry.register(engine);
    const handle = new EngineHandle(registry, makeConfig(), 'document.extract');

    await handle.execute('hello');

    expect(contexts[0].request).toEqual({ strategy: 'document.extract', input: 'hello' });
  });
});
