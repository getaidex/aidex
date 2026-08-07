import { DuplicateRegistrationError, type ExecutionContext, type Provider } from '@aidex/core';
import { ProviderCapability, createProviderCapabilities, type CapableProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import type { Engine } from '../types/Engine.js';
import { EngineNotFoundError } from '../errors/EngineNotFoundError.js';
import { UnsupportedProviderCapabilityError } from '../errors/UnsupportedProviderCapabilityError.js';
import { EngineRegistry } from './EngineRegistry.js';

function makeEngine(id: string, result: unknown = `ran:${id}`): Engine {
  return {
    id,
    name: id,
    description: `Test engine "${id}"`,
    version: '1.0.0',
    async execute() {
      return result;
    },
  };
}

function makeContext(): ExecutionContext {
  const provider: Provider = {
    name: 'inline-stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  };
  return { config: { provider }, provider };
}

describe('EngineRegistry', () => {
  describe('register()', () => {
    it('registers an engine so has()/get() find it', () => {
      const registry = new EngineRegistry();
      const engine = makeEngine('document.extract');

      registry.register(engine);

      expect(registry.has('document.extract')).toBe(true);
      expect(registry.get('document.extract')).toBe(engine);
    });

    it('throws DuplicateRegistrationError on a second registration under the same id', () => {
      const registry = new EngineRegistry();
      registry.register(makeEngine('document.extract'));

      expect(() => registry.register(makeEngine('document.extract'))).toThrow(
        DuplicateRegistrationError
      );
    });

    it('reuses @aidex/core\'s DuplicateRegistrationError with a descriptive message', () => {
      const registry = new EngineRegistry();
      registry.register(makeEngine('document.extract'));

      expect(() => registry.register(makeEngine('document.extract'))).toThrow(
        'Engine already registered: "document.extract"'
      );
    });

    it('allows engines with different ids to coexist', () => {
      const registry = new EngineRegistry();
      registry.register(makeEngine('document.extract'));
      registry.register(makeEngine('image.resize'));

      expect(registry.has('document.extract')).toBe(true);
      expect(registry.has('image.resize')).toBe(true);
    });
  });

  describe('unregister()', () => {
    it('removes a registered engine and returns true', () => {
      const registry = new EngineRegistry();
      registry.register(makeEngine('document.extract'));

      expect(registry.unregister('document.extract')).toBe(true);
      expect(registry.has('document.extract')).toBe(false);
    });

    it('returns false for an id that was never registered', () => {
      const registry = new EngineRegistry();
      expect(registry.unregister('missing')).toBe(false);
    });

    it('allows re-registering the same id after unregistering it', () => {
      const registry = new EngineRegistry();
      const first = makeEngine('document.extract', 'first');
      const second = makeEngine('document.extract', 'second');

      registry.register(first);
      registry.unregister('document.extract');
      registry.register(second);

      expect(registry.get('document.extract')).toBe(second);
    });
  });

  describe('has()', () => {
    it('returns false for an id that was never registered', () => {
      expect(new EngineRegistry().has('missing')).toBe(false);
    });
  });

  describe('get()', () => {
    it('returns undefined for a missing engine rather than throwing', () => {
      expect(new EngineRegistry().get('missing')).toBeUndefined();
    });
  });

  describe('list()', () => {
    it('returns an empty list when nothing is registered', () => {
      expect(new EngineRegistry().list()).toEqual([]);
    });

    it('returns every registered engine', () => {
      const registry = new EngineRegistry();
      const a = makeEngine('a');
      const b = makeEngine('b');
      registry.register(a);
      registry.register(b);

      expect(registry.list()).toEqual([a, b]);
    });
  });

  describe('execute()', () => {
    it('dispatches to the registered engine and returns its result', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngine('document.extract', 'extracted text'));

      const result = await registry.execute('document.extract', makeContext());

      expect(result).toBe('extracted text');
    });

    it('passes the given context through to the engine unchanged', async () => {
      const registry = new EngineRegistry();
      let seenContext: unknown;
      registry.register({
        id: 'inspect',
        name: 'inspect',
        description: 'records the context it received',
        version: '1.0.0',
        async execute(context) {
          seenContext = context;
          return null;
        },
      });
      const context = makeContext();

      await registry.execute('inspect', context);

      expect(seenContext).toBe(context);
    });

    it('throws EngineNotFoundError for an unregistered id', async () => {
      const registry = new EngineRegistry();

      await expect(registry.execute('missing', makeContext())).rejects.toBeInstanceOf(
        EngineNotFoundError
      );
    });

    it('propagates an error thrown by the engine without catching it', async () => {
      const registry = new EngineRegistry();
      const failure = new Error('engine blew up');
      registry.register({
        id: 'explode',
        name: 'explode',
        description: 'always throws',
        version: '1.0.0',
        async execute() {
          throw failure;
        },
      });

      await expect(registry.execute('explode', makeContext())).rejects.toBe(failure);
    });
  });

  describe('execute() — executionId propagation', () => {
    it('passes context.executionId to EngineNotFoundError when the engine is missing', async () => {
      const registry = new EngineRegistry();
      const context: ExecutionContext = { ...makeContext(), executionId: 'exec-123' };

      await expect(registry.execute('missing.engine', context)).rejects.toMatchObject({
        executionId: 'exec-123',
      });
    });

    it('passes context.executionId to UnsupportedProviderCapabilityError when a capability is missing', async () => {
      const registry = new EngineRegistry();
      const engine: Engine = {
        id: 'needs-streaming',
        name: 'needs-streaming',
        description: 'test',
        version: '1.0.0',
        requiredCapabilities: [ProviderCapability.Streaming],
        async execute() {
          return 'ran';
        },
      };
      registry.register(engine);
      const context: ExecutionContext = { ...makeContext(), executionId: 'exec-456' };

      await expect(registry.execute('needs-streaming', context)).rejects.toMatchObject({
        executionId: 'exec-456',
      });
    });
  });

  describe('execute() — capability requirements', () => {
    function makeCapableContext(supported: ProviderCapability[]): ExecutionContext {
      const capabilities = createProviderCapabilities(supported);
      const provider: CapableProvider = {
        name: 'capable-stub',
        async generate(prompt) {
          return { content: prompt.content };
        },
        getCapabilities() {
          return capabilities;
        },
      };
      return { config: { provider }, provider };
    }

    function makeEngineWithCapabilities(
      id: string,
      requiredCapabilities: readonly ProviderCapability[] | undefined
    ): Engine {
      return {
        id,
        name: id,
        description: `Test engine "${id}" requiring capabilities`,
        version: '1.0.0',
        requiredCapabilities,
        async execute() {
          return `ran:${id}`;
        },
      };
    }

    it('executes normally when the provider supports every required capability', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngineWithCapabilities('needs.text', [ProviderCapability.TextGeneration]));

      const result = await registry.execute(
        'needs.text',
        makeCapableContext([ProviderCapability.TextGeneration])
      );

      expect(result).toBe('ran:needs.text');
    });

    it('throws UnsupportedProviderCapabilityError listing the one missing capability', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngineWithCapabilities('needs.streaming', [ProviderCapability.Streaming]));

      const rejection = registry.execute(
        'needs.streaming',
        makeCapableContext([ProviderCapability.TextGeneration])
      );

      await expect(rejection).rejects.toBeInstanceOf(UnsupportedProviderCapabilityError);
      await expect(rejection).rejects.toMatchObject({
        engineId: 'needs.streaming',
        missingCapabilities: [ProviderCapability.Streaming],
      });
    });

    it('throws UnsupportedProviderCapabilityError listing every missing capability', async () => {
      const registry = new EngineRegistry();
      registry.register(
        makeEngineWithCapabilities('needs.many', [ProviderCapability.Streaming, ProviderCapability.ToolCalling])
      );

      const rejection = registry.execute(
        'needs.many',
        makeCapableContext([ProviderCapability.TextGeneration])
      );

      await expect(rejection).rejects.toMatchObject({
        missingCapabilities: [ProviderCapability.Streaming, ProviderCapability.ToolCalling],
      });
    });

    it('throws UnsupportedProviderCapabilityError for a provider without getCapabilities()', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngineWithCapabilities('needs.text', [ProviderCapability.TextGeneration]));

      const rejection = registry.execute('needs.text', makeContext());

      await expect(rejection).rejects.toBeInstanceOf(UnsupportedProviderCapabilityError);
      await expect(rejection).rejects.toMatchObject({
        missingCapabilities: [ProviderCapability.TextGeneration],
      });
    });

    it('executes normally when requiredCapabilities is an empty array, regardless of provider', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngineWithCapabilities('needs.nothing', []));

      const result = await registry.execute('needs.nothing', makeContext());

      expect(result).toBe('ran:needs.nothing');
    });

    it('executes normally when requiredCapabilities is undefined, regardless of provider (today\'s behavior)', async () => {
      const registry = new EngineRegistry();
      registry.register(makeEngineWithCapabilities('needs.undefined', undefined));

      const result = await registry.execute('needs.undefined', makeContext());

      expect(result).toBe('ran:needs.undefined');
    });

    it('never calls engine.execute() when a required capability is missing', async () => {
      const registry = new EngineRegistry();
      let executed = false;
      registry.register({
        id: 'needs.streaming',
        name: 'needs.streaming',
        description: 'Should never run',
        version: '1.0.0',
        requiredCapabilities: [ProviderCapability.Streaming],
        async execute() {
          executed = true;
          return null;
        },
      });

      await expect(
        registry.execute('needs.streaming', makeCapableContext([ProviderCapability.TextGeneration]))
      ).rejects.toBeInstanceOf(UnsupportedProviderCapabilityError);
      expect(executed).toBe(false);
    });
  });

  describe('extensibility — future plugins registering engines', () => {
    it('accepts an arbitrary custom-shaped engine without any registry code change', async () => {
      const registry = new EngineRegistry();
      registry.register({
        id: 'future.plugin.engine',
        name: 'Future Plugin Engine',
        description: 'Registered by a hypothetical future plugin',
        version: '0.0.1',
        async execute() {
          return { ok: true };
        },
      });

      expect(await registry.execute('future.plugin.engine', makeContext())).toEqual({ ok: true });
    });
  });
});
