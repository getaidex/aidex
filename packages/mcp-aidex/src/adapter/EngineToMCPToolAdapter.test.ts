import type { ExecutionContext, Provider } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { InvalidEngineError } from '../errors/InvalidEngineError.js';
import { EngineToMCPToolAdapter } from './EngineToMCPToolAdapter.js';

function makeContext(): ExecutionContext {
  const provider: Provider = { name: 'mock-provider', async generate() { return { content: '' }; } };
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

describe('EngineToMCPToolAdapter', () => {
  describe('metadata mapping', () => {
    it('maps Engine.id to MCPTool.name', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });

      const tool = adapter.adapt(makeEngine({ id: 'document.summarize' }));

      expect(tool.name).toBe('document.summarize');
    });

    it('maps Engine.description to MCPTool.description', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });

      const tool = adapter.adapt(makeEngine({ description: 'Summarizes a document' }));

      expect(tool.description).toBe('Summarizes a document');
    });

    it('reads name/description fresh from the engine object, not a cached copy', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });
      const engine = makeEngine({ id: 'x', description: 'first' });

      const first = adapter.adapt(engine);
      expect(first.description).toBe('first');

      // The same engine *object* mutated (a mock scenario a real Engine's
      // readonly fields would never allow, but proves nothing is cached
      // at adapt()-time beyond a reference to the engine itself).
      (engine as { description: string }).description = 'second';
      const second = adapter.adapt(engine);
      expect(second.description).toBe('second');
    });

    it('does not set inputSchema — Engine has no JSON Schema equivalent', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });

      const tool = adapter.adapt(makeEngine());

      expect(tool.inputSchema).toBeUndefined();
    });
  });

  describe('tool generation', () => {
    it('returns an MCPTool with an execute() function', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });

      const tool = adapter.adapt(makeEngine());

      expect(typeof tool.execute).toBe('function');
    });

    it('rejects an engine with a non-empty-string id requirement violated (empty string)', () => {
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });

      expect(() => adapter.adapt(makeEngine({ id: '' }))).toThrow(InvalidEngineError);
    });
  });

  describe('execution', () => {
    it("the built tool's execute() invokes the wrapped Engine.execute()", async () => {
      let called = false;
      const engine = makeEngine({
        async execute() {
          called = true;
          return { done: true };
        },
      });
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });
      const tool = adapter.adapt(engine);

      await tool.execute({});

      expect(called).toBe(true);
    });

    it("the built tool's execute() result matches executeAdaptedEngine's own mapping", async () => {
      const engine = makeEngine({
        async execute() {
          return { value: 42 };
        },
      });
      const adapter = new EngineToMCPToolAdapter({ context: makeContext() });
      const tool = adapter.adapt(engine);

      const result = await tool.execute({});

      expect(result).toEqual({ content: [{ type: 'text', text: '{"value":42}' }] });
    });

    it('uses the context supplied at adapter construction, not a new one per call', async () => {
      const context = makeContext();
      let seenProvider: Provider | undefined;
      const engine = makeEngine({
        async execute(ctx) {
          seenProvider = ctx.provider;
          return {};
        },
      });
      const adapter = new EngineToMCPToolAdapter({ context });
      const tool = adapter.adapt(engine);

      await tool.execute({});

      expect(seenProvider).toBe(context.provider);
    });
  });
});
