import { Aidex, DuplicateRegistrationError, type Provider, type Strategy } from '@aidex/core';
import { EngineRegistry, type Engine } from '@aidex/engines';
import type { PromptTemplate } from '@aidex/prompts';
import type { Tool } from '@aidex/tools';
import { describe, expect, it } from 'vitest';
import type { ExtendedPlugin } from '../types/ExtendedPlugin.js';
import { PluginManager } from './PluginManager.js';

function makeAidex(): Aidex {
  const provider: Provider = {
    name: 'inline-stub',
    async generate(prompt) {
      return { content: `generated:${prompt.content}` };
    },
  };
  return new Aidex({ provider });
}

function makeEngine(id: string): Engine {
  return {
    id,
    name: id,
    description: `Test engine "${id}"`,
    version: '1.0.0',
    async execute() {
      return `ran:${id}`;
    },
  };
}

function makeStrategy(name: string): Strategy<string> {
  return {
    name,
    async execute(request) {
      return `strategy:${name}:${String(request.input)}`;
    },
  };
}

function makePrompt(id: string): PromptTemplate {
  return { id, version: '1.0.0', template: `Hello, ${id}!` };
}

function makeTool(id: string): Tool {
  return {
    id,
    name: id,
    description: `Test tool "${id}"`,
    async execute() {
      return `ran:${id}`;
    },
  };
}

describe('PluginManager', () => {
  describe('use()', () => {
    it('installs a plugin with no declarations without throwing', () => {
      const manager = new PluginManager(makeAidex());
      expect(() => manager.use({ name: 'noop' })).not.toThrow();
    });

    it('marks a plugin as installed', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'noop' });

      expect(manager.isInstalled('noop')).toBe(true);
      expect(manager.isInstalled('never-installed')).toBe(false);
    });

    it('throws DuplicateRegistrationError when the same plugin name is installed twice', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'noop' });

      expect(() => manager.use({ name: 'noop' })).toThrow(DuplicateRegistrationError);
      expect(() => manager.use({ name: 'noop' })).toThrow('Plugin already registered: "noop"');
    });

    it('still wires lifecycle hooks through the real Aidex.use(), independent of any registration', async () => {
      const aidex = makeAidex();
      const manager = new PluginManager(aidex);
      const calls: string[] = [];
      const plugin: ExtendedPlugin = {
        name: 'tracker',
        beforeExecute: () => {
          calls.push('beforeExecute');
        },
        afterExecute: () => {
          calls.push('afterExecute');
        },
      };

      manager.use(plugin);
      aidex.registerStrategy(makeStrategy('echo'));
      await aidex.execute({ strategy: 'echo', input: 'hi' });

      expect(calls).toEqual(['beforeExecute', 'afterExecute']);
    });
  });

  describe('constructor backward compatibility', () => {
    it('still works with only an Aidex instance (1-arg, pre-Prompt/Tool-Registry signature)', () => {
      expect(() => new PluginManager(makeAidex())).not.toThrow();
    });

    it('still works with an explicit EngineRegistry (2-arg, pre-Prompt/Tool-Registry signature)', () => {
      expect(() => new PluginManager(makeAidex(), new EngineRegistry())).not.toThrow();
    });

    it('defaults to a fresh PromptRegistry/ToolRegistry when none are supplied', () => {
      const manager = new PluginManager(makeAidex());

      expect(manager.getPromptRegistry().list()).toEqual([]);
      expect(manager.getToolRegistry().list()).toEqual([]);
    });
  });

  describe('engine registration', () => {
    it('registers engines a plugin declares into the EngineRegistry', async () => {
      const manager = new PluginManager(makeAidex());
      const plugin: ExtendedPlugin = {
        name: 'engine-plugin',
        registerEngines: () => [makeEngine('document.extract')],
      };

      manager.use(plugin);

      expect(manager.getEngineRegistry().has('document.extract')).toBe(true);
    });

    it('propagates a duplicate engine id as the same DuplicateRegistrationError EngineRegistry throws', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'first', registerEngines: () => [makeEngine('shared.id')] });

      expect(() =>
        manager.use({ name: 'second', registerEngines: () => [makeEngine('shared.id')] })
      ).toThrow(DuplicateRegistrationError);
    });
  });

  describe('strategy registration', () => {
    it('registers strategies a plugin declares onto the underlying Aidex instance', async () => {
      const aidex = makeAidex();
      const manager = new PluginManager(aidex);
      const plugin: ExtendedPlugin = {
        name: 'strategy-plugin',
        registerStrategies: () => [makeStrategy('summarize')],
      };

      manager.use(plugin);
      const result = await aidex.execute<string>({ strategy: 'summarize', input: 'hi' });

      expect(result).toBe('strategy:summarize:hi');
    });
  });

  describe('prompt registration (real PromptRegistry)', () => {
    it('registers prompts a plugin declares into the PromptRegistry', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({
        name: 'prompt-plugin',
        registerPrompts: () => [makePrompt('greeting')],
      });

      expect(manager.getPromptRegistry().has('greeting')).toBe(true);
    });

    it('registered prompts are renderable through the PromptRegistry, exactly as if registered directly', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({
        name: 'prompt-plugin',
        registerPrompts: () => [{ id: 'greeting', version: '1.0.0', template: 'Hello, {{name}}!', variables: ['name'] }],
      });

      expect(manager.getPromptRegistry().render('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    });

    it('propagates a duplicate prompt id+version as the same DuplicateRegistrationError PromptRegistry throws', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'first', registerPrompts: () => [makePrompt('shared')] });

      expect(() =>
        manager.use({ name: 'second', registerPrompts: () => [makePrompt('shared')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('accumulates prompts across multiple installed plugins', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'plugin-a', registerPrompts: () => [makePrompt('a')] });
      manager.use({ name: 'plugin-b', registerPrompts: () => [makePrompt('b')] });

      expect(manager.getPromptRegistry().list().map((p) => p.id)).toEqual(['a', 'b']);
    });
  });

  describe('tool registration (real ToolRegistry)', () => {
    it('registers tools a plugin declares into the ToolRegistry', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({
        name: 'tool-plugin',
        registerTools: () => [makeTool('calculator')],
      });

      expect(manager.getToolRegistry().has('calculator')).toBe(true);
    });

    it('registered tools are executable through the ToolRegistry, exactly as if registered directly', async () => {
      const manager = new PluginManager(makeAidex());
      manager.use({
        name: 'tool-plugin',
        registerTools: () => [makeTool('calculator')],
      });

      expect(await manager.getToolRegistry().execute('calculator', {})).toBe('ran:calculator');
    });

    it('propagates a duplicate tool id as the same DuplicateRegistrationError ToolRegistry throws', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'first', registerTools: () => [makeTool('shared')] });

      expect(() =>
        manager.use({ name: 'second', registerTools: () => [makeTool('shared')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('accumulates tools across multiple installed plugins', () => {
      const manager = new PluginManager(makeAidex());
      manager.use({ name: 'plugin-a', registerTools: () => [makeTool('a')] });
      manager.use({ name: 'plugin-b', registerTools: () => [makeTool('b')] });

      expect(manager.getToolRegistry().list().map((t) => t.id)).toEqual(['a', 'b']);
    });
  });

  describe('independence from application logic', () => {
    it('installs an arbitrary plugin declaring all four extension kinds at once', async () => {
      const aidex = makeAidex();
      const manager = new PluginManager(aidex);

      manager.use({
        name: 'full-plugin',
        registerEngines: () => [makeEngine('full.engine')],
        registerStrategies: () => [makeStrategy('full-strategy')],
        registerPrompts: () => [makePrompt('full.prompt')],
        registerTools: () => [makeTool('full.tool')],
      });

      expect(manager.getEngineRegistry().has('full.engine')).toBe(true);
      expect(await aidex.execute({ strategy: 'full-strategy', input: 'x' })).toBe(
        'strategy:full-strategy:x'
      );
      expect(manager.getPromptRegistry().has('full.prompt')).toBe(true);
      expect(manager.getToolRegistry().has('full.tool')).toBe(true);
    });
  });
});
