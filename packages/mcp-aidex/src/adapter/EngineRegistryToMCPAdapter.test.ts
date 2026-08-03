import type { ExecutionContext, Provider } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import { EngineRegistry } from '@aidex/engines';
import { MCPServer } from '@aidex/mcp';
import type { MCPTransport } from '@aidex/mcp';
import { describe, expect, it } from 'vitest';
import { EngineRegistryToMCPAdapter } from './EngineRegistryToMCPAdapter.js';

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

describe('EngineRegistryToMCPAdapter', () => {
  describe('automatic registration of all engines', () => {
    it('registerAll() exposes every engine currently in the EngineRegistry as an MCP tool', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      engineRegistry.register(makeEngine({ id: 'c' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();

      expect(mcpServer.tools.list().map((t) => t.name).sort()).toEqual(['a', 'b', 'c']);
      expect(adapter.listRegisteredEngines().map((e) => e.id).sort()).toEqual(['a', 'b', 'c']);
    });

    it('registers nothing when the EngineRegistry is empty', () => {
      const engineRegistry = new EngineRegistry();
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();

      expect(mcpServer.tools.list()).toEqual([]);
    });

    it('preserves the Phase 2 Engine→Tool mapping (name←id, description←description)', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'document.summarize', description: 'Summarizes a document' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();

      const tool = mcpServer.tools.get('document.summarize');
      expect(tool?.name).toBe('document.summarize');
      expect(tool?.description).toBe('Summarizes a document');
    });

    it('picks up engines registered into the EngineRegistry after the first registerAll() call', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      engineRegistry.register(makeEngine({ id: 'b' }));
      adapter.registerAll();

      expect(mcpServer.tools.list().map((t) => t.name).sort()).toEqual(['a', 'b']);
    });
  });

  describe('duplicate protection', () => {
    it('calling registerAll() twice does not throw and does not double-register', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();
      expect(() => adapter.registerAll()).not.toThrow();

      expect(mcpServer.tools.list()).toHaveLength(2);
      expect(adapter.listRegisteredEngines()).toHaveLength(2);
    });

    it('a tool already registered directly on mcpServer.tools (not via this adapter) is a genuine conflict, not silently skipped', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      const mcpServer = makeServer();
      mcpServer.tools.register({ name: 'a', async execute() { return { content: [] }; } });
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      // Only engines this adapter already registered are silently
      // skipped (see the idempotent-registerAll tests above) — a
      // collision with a tool registered by anything else is a real
      // naming conflict and still throws, the same fail-fast behavior
      // MCPAidexAdapter.registerEngines() has, rather than dropping an
      // engine the caller expected to be exposed.
      expect(() => adapter.registerAll()).toThrow();
      expect(mcpServer.tools.get('a')).toMatchObject({ name: 'a' });
    });
  });

  describe('unregister/cleanup', () => {
    it('unregisterAll() removes every automatically-registered tool from mcpServer.tools', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      adapter.unregisterAll();

      expect(mcpServer.tools.list()).toEqual([]);
      expect(adapter.listRegisteredEngines()).toEqual([]);
    });

    it('leaves a manually-registered tool on mcpServer.tools untouched by unregisterAll()', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'auto' }));
      const mcpServer = makeServer();
      mcpServer.tools.register({ name: 'manual', async execute() { return { content: [] }; } });
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      adapter.unregisterAll();

      expect(mcpServer.tools.has('manual')).toBe(true);
      expect(mcpServer.tools.has('auto')).toBe(false);
    });

    it('is safe to call before registerAll() has ever run', () => {
      const adapter = new EngineRegistryToMCPAdapter({
        engineRegistry: new EngineRegistry(),
        mcpServer: makeServer(),
        context: makeContext(),
      });

      expect(() => adapter.unregisterAll()).not.toThrow();
    });

    it('registerAll() can re-populate after unregisterAll()', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();
      adapter.unregisterAll();

      adapter.registerAll();

      expect(mcpServer.tools.has('a')).toBe(true);
    });
  });

  describe('registry synchronization', () => {
    it('mcpServer.tools.list() length always matches the EngineRegistry\'s own list() length after registerAll()', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      engineRegistry.register(makeEngine({ id: 'c' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();

      expect(mcpServer.tools.list()).toHaveLength(engineRegistry.list().length);
      expect(adapter.listRegisteredEngines()).toHaveLength(engineRegistry.list().length);
    });

    it('listRegisteredEngines() ids exactly match the ids currently on mcpServer.tools', () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({ id: 'a' }));
      engineRegistry.register(makeEngine({ id: 'b' }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });

      adapter.registerAll();

      const adapterIds = adapter.listRegisteredEngines().map((e) => e.id).sort();
      const toolNames = mcpServer.tools.list().map((t) => t.name).sort();
      expect(adapterIds).toEqual(toolNames);
    });
  });

  describe('execution through automatically registered tools', () => {
    it('an engine exposed via registerAll() actually runs when its tool is called through mcpServer.tools', async () => {
      let runCount = 0;
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({
        id: 'auto',
        async execute() {
          runCount += 1;
          return { done: true };
        },
      }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      const result = await mcpServer.tools.call('auto', { x: 1 });

      expect(runCount).toBe(1);
      expect(result).toEqual({ content: [{ type: 'text', text: '{"done":true}' }] });
    });

    it('tool call input reaches the engine as context.request.input, unchanged', async () => {
      let seenInput: unknown;
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({
        id: 'auto',
        async execute(context) {
          seenInput = context.request?.input;
          return {};
        },
      }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      await mcpServer.tools.call('auto', { query: 'hi' });

      expect(seenInput).toEqual({ query: 'hi' });
    });
  });

  describe('provider/context propagation', () => {
    it('every automatically-registered engine shares the exact same provider given at construction', async () => {
      const context = makeContext();
      const seenProviders: Provider[] = [];
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({
        id: 'a',
        async execute(ctx) {
          seenProviders.push(ctx.provider);
          return {};
        },
      }));
      engineRegistry.register(makeEngine({
        id: 'b',
        async execute(ctx) {
          seenProviders.push(ctx.provider);
          return {};
        },
      }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context });
      adapter.registerAll();

      await mcpServer.tools.call('a', {});
      await mcpServer.tools.call('b', {});

      expect(seenProviders[0]).toBe(context.provider);
      expect(seenProviders[1]).toBe(context.provider);
    });

    it('never constructs a Provider of its own', () => {
      const context = makeContext();
      const originalProvider = context.provider;
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine());
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer: makeServer(), context });

      adapter.registerAll();

      expect(context.provider).toBe(originalProvider);
    });
  });

  describe('error propagation', () => {
    it('an engine error comes back as isError: true through the automatically-registered tool, not a thrown exception', async () => {
      const engineRegistry = new EngineRegistry();
      engineRegistry.register(makeEngine({
        id: 'broken',
        async execute() {
          throw new Error('auto-registered engine failed');
        },
      }));
      const mcpServer = makeServer();
      const adapter = new EngineRegistryToMCPAdapter({ engineRegistry, mcpServer, context: makeContext() });
      adapter.registerAll();

      const result = await mcpServer.tools.call('broken', {});

      expect(result).toEqual({ content: [{ type: 'text', text: 'auto-registered engine failed' }], isError: true });
    });
  });
});
