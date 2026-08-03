import type { ExecutionContext, Provider } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { executeAdaptedEngine } from './executeAdaptedEngine.js';

function makeProvider(): Provider {
  return { name: 'mock-provider', async generate() { return { content: '' }; } };
}

function makeContext(provider: Provider = makeProvider()): ExecutionContext {
  return { config: { provider }, provider };
}

function makeEngine(overrides: Partial<Engine> = {}): Engine {
  return {
    id: 'test.engine',
    name: 'Test Engine',
    description: 'A test engine',
    version: '1.0.0',
    async execute() {
      return { ok: true };
    },
    ...overrides,
  };
}

describe('executeAdaptedEngine', () => {
  it('maps MCP tool input into context.request.input unchanged (generic object mapping)', async () => {
    let seenInput: unknown;
    const engine = makeEngine({
      async execute(context) {
        seenInput = context.request?.input;
        return { ok: true };
      },
    });

    await executeAdaptedEngine(engine, { foo: 'bar', nested: { a: 1 } }, makeContext());

    expect(seenInput).toEqual({ foo: 'bar', nested: { a: 1 } });
  });

  it('sets context.request.strategy to the engine id', async () => {
    let seenStrategy: string | undefined;
    const engine = makeEngine({
      id: 'my.engine',
      async execute(context) {
        seenStrategy = context.request?.strategy;
        return {};
      },
    });

    await executeAdaptedEngine(engine, {}, makeContext());

    expect(seenStrategy).toBe('my.engine');
  });

  it('reuses the exact same base context object (provider/config/logger), never constructing a new provider', async () => {
    const provider = makeProvider();
    const baseContext = makeContext(provider);
    let seenProvider: Provider | undefined;
    const engine = makeEngine({
      async execute(context) {
        seenProvider = context.provider;
        return {};
      },
    });

    await executeAdaptedEngine(engine, {}, baseContext);

    expect(seenProvider).toBe(provider);
  });

  it('wraps the engine result as one JSON text content block', async () => {
    const engine = makeEngine({
      async execute() {
        return { summary: 'hello', count: 3 };
      },
    });

    const result = await executeAdaptedEngine(engine, {}, makeContext());

    expect(result).toEqual({ content: [{ type: 'text', text: '{"summary":"hello","count":3}' }] });
  });

  it('does not set isError on a successful execution', async () => {
    const engine = makeEngine();

    const result = await executeAdaptedEngine(engine, {}, makeContext());

    expect(result.isError).toBeUndefined();
  });

  it('propagates an engine error through MCPToolResult.isError, without swallowing it', async () => {
    const engine = makeEngine({
      async execute() {
        throw new Error('engine failed: bad input');
      },
    });

    const result = await executeAdaptedEngine(engine, {}, makeContext());

    expect(result).toEqual({ content: [{ type: 'text', text: 'engine failed: bad input' }], isError: true });
  });

  it('never exposes a stack trace in the error result', async () => {
    const engine = makeEngine({
      async execute() {
        throw new Error('boom');
      },
    });

    const result = await executeAdaptedEngine(engine, {}, makeContext());

    const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
    expect(text).not.toContain('at ');
    expect(text).not.toContain('.ts:');
  });

  it('handles a non-Error throw (a plain string) without crashing', async () => {
    const engine = makeEngine({
      async execute() {
        throw 'a plain string failure';
      },
    });

    const result = await executeAdaptedEngine(engine, {}, makeContext());

    expect(result).toEqual({ content: [{ type: 'text', text: 'a plain string failure' }], isError: true });
  });
});
