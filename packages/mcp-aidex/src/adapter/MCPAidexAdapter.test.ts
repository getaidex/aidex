import { DuplicateRegistrationError } from '@aidex/core';
import type { ExecutionContext, Provider } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import { MCPServer } from '@aidex/mcp';
import type { MCPTransport } from '@aidex/mcp';
import { describe, expect, it } from 'vitest';
import { MCPAidexAdapter } from './MCPAidexAdapter.js';

function makeNoopTransport(): MCPTransport {
  return { name: 'noop', start() {}, send() {}, close() {} };
}

function makeServer(): MCPServer {
  return new MCPServer({ name: 'test-server', version: '1.0.0', transport: makeNoopTransport() });
}

function makeContext(provider: Provider = { name: 'mock', async generate() { return { content: '' }; } }): ExecutionContext {
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

describe('MCPAidexAdapter', () => {
  describe('engine registration', () => {
    it('registers an engine and makes it discoverable both on the adapter and on mcpServer.tools', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      const engine = makeEngine({ id: 'document.summarize' });

      adapter.registerEngine(engine);

      expect(adapter.hasEngine('document.summarize')).toBe(true);
      expect(mcpServer.tools.has('document.summarize')).toBe(true);
    });

    it('does not execute the engine during registration', () => {
      let executed = false;
      const engine = makeEngine({
        async execute() {
          executed = true;
          return {};
        },
      });
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context: makeContext() });

      adapter.registerEngine(engine);

      expect(executed).toBe(false);
    });
  });

  describe('multiple engine registration', () => {
    it('registerEngines() registers every engine in order', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      const engineA = makeEngine({ id: 'a' });
      const engineB = makeEngine({ id: 'b' });
      const engineC = makeEngine({ id: 'c' });

      adapter.registerEngines([engineA, engineB, engineC]);

      expect(adapter.listRegisteredEngines().map((e) => e.id)).toEqual(['a', 'b', 'c']);
      expect(mcpServer.tools.list().map((t) => t.name).sort()).toEqual(['a', 'b', 'c']);
    });

    it('stops at the first duplicate, leaving engines registered before it in place', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(makeEngine({ id: 'a' }));

      expect(() => adapter.registerEngines([makeEngine({ id: 'b' }), makeEngine({ id: 'a' }), makeEngine({ id: 'c' })]))
        .toThrow(DuplicateRegistrationError);

      expect(adapter.hasEngine('a')).toBe(true);
      expect(adapter.hasEngine('b')).toBe(true);
      expect(adapter.hasEngine('c')).toBe(false);
    });
  });

  describe('duplicate registration', () => {
    it('throws @aidex/core\'s DuplicateRegistrationError when the same engine id is registered twice', () => {
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context: makeContext() });
      adapter.registerEngine(makeEngine({ id: 'dup' }));

      expect(() => adapter.registerEngine(makeEngine({ id: 'dup' }))).toThrow(DuplicateRegistrationError);
    });

    it('leaves the adapter and mcpServer.tools unchanged after a rejected duplicate', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(makeEngine({ id: 'dup', description: 'original' }));

      expect(() => adapter.registerEngine(makeEngine({ id: 'dup', description: 'replacement' }))).toThrow();

      expect(mcpServer.tools.get('dup')?.description).toBe('original');
      expect(adapter.listRegisteredEngines()).toHaveLength(1);
    });
  });

  describe('unregister', () => {
    it('removes the engine from both the adapter and mcpServer.tools', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(makeEngine({ id: 'x' }));

      const removed = adapter.unregisterEngine('x');

      expect(removed).toBe(true);
      expect(adapter.hasEngine('x')).toBe(false);
      expect(mcpServer.tools.has('x')).toBe(false);
    });

    it('returns false for an id that was never registered', () => {
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context: makeContext() });

      expect(adapter.unregisterEngine('missing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes every registered engine from both the adapter and mcpServer.tools', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngines([makeEngine({ id: 'a' }), makeEngine({ id: 'b' })]);

      adapter.clear();

      expect(adapter.listRegisteredEngines()).toEqual([]);
      expect(mcpServer.tools.list()).toEqual([]);
    });

    it('is safe to call on an empty adapter', () => {
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context: makeContext() });

      expect(() => adapter.clear()).not.toThrow();
    });
  });

  describe('metadata mapping (integration)', () => {
    it('the tool registered into mcpServer.tools carries the engine\'s id/description', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });

      adapter.registerEngine(makeEngine({ id: 'content.rewrite', description: 'Rewrites content' }));

      const tool = mcpServer.tools.get('content.rewrite');
      expect(tool?.name).toBe('content.rewrite');
      expect(tool?.description).toBe('Rewrites content');
    });

    it('version is reachable via listRegisteredEngines(), not duplicated into the tool', () => {
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context: makeContext() });

      adapter.registerEngine(makeEngine({ id: 'x', version: '3.2.1' }));

      expect(adapter.listRegisteredEngines()[0]?.version).toBe('3.2.1');
    });
  });

  describe('request mapping', () => {
    it('mcpServer.tools.call() input reaches the engine as context.request.input, unchanged', async () => {
      let seenInput: unknown;
      const engine = makeEngine({
        async execute(context) {
          seenInput = context.request?.input;
          return {};
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(engine);

      await mcpServer.tools.call('test.engine', { query: 'hello', limit: 5 });

      expect(seenInput).toEqual({ query: 'hello', limit: 5 });
    });
  });

  describe('result mapping', () => {
    it('the engine\'s Result comes back as one JSON text content block via mcpServer.tools.call()', async () => {
      const engine = makeEngine({
        async execute() {
          return { title: 'Report', wordCount: 120 };
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(engine);

      const result = await mcpServer.tools.call('test.engine', {});

      expect(result).toEqual({ content: [{ type: 'text', text: '{"title":"Report","wordCount":120}' }] });
    });
  });

  describe('execution', () => {
    it('a registered engine actually runs when its tool is called through mcpServer.tools', async () => {
      let runCount = 0;
      const engine = makeEngine({
        async execute() {
          runCount += 1;
          return {};
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(engine);

      await mcpServer.tools.call('test.engine', {});
      await mcpServer.tools.call('test.engine', {});

      expect(runCount).toBe(2);
    });
  });

  describe('execution context propagation', () => {
    it('every registered engine shares the exact same context/provider given at construction', async () => {
      const context = makeContext();
      const seenProviders: Provider[] = [];
      const engineA = makeEngine({
        id: 'a',
        async execute(ctx) {
          seenProviders.push(ctx.provider);
          return {};
        },
      });
      const engineB = makeEngine({
        id: 'b',
        async execute(ctx) {
          seenProviders.push(ctx.provider);
          return {};
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context });
      adapter.registerEngines([engineA, engineB]);

      await mcpServer.tools.call('a', {});
      await mcpServer.tools.call('b', {});

      expect(seenProviders[0]).toBe(context.provider);
      expect(seenProviders[1]).toBe(context.provider);
      expect(seenProviders[0]).toBe(seenProviders[1]);
    });

    it('does not construct a Provider itself — the adapter never touches config.provider beyond passing it through', () => {
      const context = makeContext();
      const originalProvider = context.provider;
      const adapter = new MCPAidexAdapter({ mcpServer: makeServer(), context });

      adapter.registerEngine(makeEngine());

      expect(context.provider).toBe(originalProvider);
    });
  });

  describe('engine error propagation', () => {
    it('an engine error comes back as isError: true via mcpServer.tools.call(), not a thrown exception', async () => {
      const engine = makeEngine({
        async execute() {
          throw new Error('engine exploded');
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(engine);

      const result = await mcpServer.tools.call('test.engine', {});

      expect(result).toEqual({ content: [{ type: 'text', text: 'engine exploded' }], isError: true });
    });

    it('does not swallow the error — the message is present, not discarded', async () => {
      const engine = makeEngine({
        async execute() {
          throw new Error('specific failure reason');
        },
      });
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      adapter.registerEngine(engine);

      const result = await mcpServer.tools.call('test.engine', {});

      expect(result.content[0]).toEqual({ type: 'text', text: 'specific failure reason' });
    });
  });

  describe('registry synchronization', () => {
    it('mcpServer.tools.list() length always matches listRegisteredEngines() length through register/unregister/clear', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });

      adapter.registerEngines([makeEngine({ id: 'a' }), makeEngine({ id: 'b' }), makeEngine({ id: 'c' })]);
      expect(mcpServer.tools.list()).toHaveLength(adapter.listRegisteredEngines().length);

      adapter.unregisterEngine('b');
      expect(mcpServer.tools.list()).toHaveLength(adapter.listRegisteredEngines().length);
      expect(mcpServer.tools.has('b')).toBe(false);

      adapter.clear();
      expect(mcpServer.tools.list()).toHaveLength(adapter.listRegisteredEngines().length);
      expect(mcpServer.tools.list()).toHaveLength(0);
    });

    it('a tool registered directly on mcpServer.tools (not through the adapter) is untouched by clear()', () => {
      const mcpServer = makeServer();
      const adapter = new MCPAidexAdapter({ mcpServer, context: makeContext() });
      mcpServer.tools.register({ name: 'manual-tool', async execute() { return { content: [] }; } });
      adapter.registerEngine(makeEngine({ id: 'adapted' }));

      adapter.clear();

      expect(mcpServer.tools.has('manual-tool')).toBe(true);
      expect(mcpServer.tools.has('adapted')).toBe(false);
    });
  });
});
