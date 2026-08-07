import { Aidex, type AidexRequest, type Strategy } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { StubProvider } from '@aidex/providers';
import { Workflow, WorkflowRegistry } from '@aidex/workflow';
import { PromptRegistry } from '@aidex/prompts';
import { EngineCatalog } from '@aidex/catalog';
import { ToolRegistry } from '@aidex/tools';
import { describe, expect, it } from 'vitest';
import { AI } from './AI.js';

function makeRecordingStrategy(name: string): {
  strategy: Strategy<string>;
  calls: AidexRequest[];
} {
  const calls: AidexRequest[] = [];
  const strategy: Strategy<string> = {
    name,
    async execute(request) {
      calls.push(request);
      return `handled:${String(request.input)}`;
    },
  };
  return { strategy, calls };
}

describe('AI', () => {
  it('execute() delegates the request to the kernel unchanged and returns its result', async () => {
    const kernel = new Aidex({ provider: new StubProvider() });
    const { strategy, calls } = makeRecordingStrategy('custom');
    kernel.registerStrategy(strategy);
    const ai = new AI(kernel);

    const result = await ai.execute<string>({ strategy: 'custom', input: 'hello' });

    expect(result).toBe('handled:hello');
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(typeof call.executionId).toBe('string');
    expect(call.options?.executionId).toBe(call.executionId);
    expect(call).toMatchObject({ strategy: 'custom', input: 'hello' });
  });

  it('text() delegates to the kernel using the "text-generation" strategy name', async () => {
    const kernel = new Aidex({ provider: new StubProvider() });
    const { strategy, calls } = makeRecordingStrategy('text-generation');
    kernel.registerStrategy(strategy);
    const ai = new AI(kernel);

    const result = await ai.text('hello world');

    expect(result).toBe('handled:hello world');
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(typeof call.executionId).toBe('string');
    expect(call.options?.executionId).toBe(call.executionId);
    expect(call).toMatchObject({ strategy: 'text-generation', input: 'hello world' });
  });

  it('does not duplicate strategy logic — text() works with whatever strategy is registered under that name', async () => {
    const kernel = new Aidex({ provider: new StubProvider() });
    kernel.registerStrategy({
      name: 'text-generation',
      async execute() {
        return 'anything the strategy decides to return';
      },
    });
    const ai = new AI(kernel);

    expect(await ai.text('irrelevant')).toBe('anything the strategy decides to return');
  });

  it('propagates a rejection from execute() without catching it', async () => {
    const kernel = new Aidex({ provider: new StubProvider() });
    const ai = new AI(kernel);

    await expect(ai.execute({ strategy: 'missing' })).rejects.toThrow(/not found/i);
  });

  it('propagates a rejection from text() without catching it', async () => {
    const kernel = new Aidex({ provider: new StubProvider() });
    const failure = new Error('boom');
    kernel.registerStrategy({
      name: 'text-generation',
      async execute() {
        throw failure;
      },
    });
    const ai = new AI(kernel);

    await expect(ai.text('hi')).rejects.toBe(failure);
  });

  describe('engine()', () => {
    it('throws a clear error when the AI was constructed without an engine registry/config', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.engine('document.extract')).toThrow(/requires an AI built with a provider/i);
    });

    it('returns an EngineHandle wired to the given engineRegistry/config when both are supplied', async () => {
      const provider = new StubProvider();
      const kernel = new Aidex({ provider });
      const registry = new EngineRegistry();
      registry.register({
        id: 'document.extract',
        name: 'document.extract',
        description: 'test',
        version: '1.0.0',
        async execute(context) {
          return `provider:${context.provider.name}`;
        },
      });
      const config = { provider };
      const ai = new AI(kernel, registry, config);

      const result = await ai.engine('document.extract').execute('irrelevant');

      expect(result).toBe('provider:stub');
    });
  });

  describe('workflow()', () => {
    it('throws a clear error when the AI was constructed without a workflow registry/config', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.workflow('resume-review')).toThrow(/requires an AI built with a provider/i);
    });

    it('returns a WorkflowHandle wired to the given workflowRegistry/config when both are supplied', async () => {
      const provider = new StubProvider();
      const kernel = new Aidex({ provider });
      const registry = new WorkflowRegistry();
      const workflow = new Workflow<{ seen?: string }>('resume-review');
      workflow.addStep({
        name: 'echo-provider-name',
        async execute(context) {
          context.seen = provider.name;
        },
      });
      registry.register(workflow);
      const config = { provider };
      const ai = new AI(kernel, undefined, config, registry);

      const result = await ai.workflow('resume-review').execute();

      expect(result.seen).toBe('stub');
    });
  });

  describe('renderPrompt()', () => {
    it('throws a clear error when the AI was constructed without a prompt registry', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.renderPrompt('greeting')).toThrow(/requires an AI built with a prompt registry/i);
    });

    it('delegates to the real PromptRegistry.render()', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const registry = new PromptRegistry();
      registry.register({
        id: 'greeting',
        version: '1.0.0',
        template: 'Hello, {{name}}!',
        variables: ['name'],
      });
      const ai = new AI(kernel, undefined, undefined, undefined, registry);

      expect(ai.renderPrompt('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    });
  });

  describe('prompts()', () => {
    it('throws a clear error when the AI was constructed without a prompt registry', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.prompts()).toThrow(/requires an AI built with a prompt registry/i);
    });

    it('returns the exact PromptRegistry instance the AI was constructed with', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const registry = new PromptRegistry();
      const ai = new AI(kernel, undefined, undefined, undefined, registry);

      expect(ai.prompts()).toBe(registry);
    });
  });

  describe('catalog()', () => {
    it('throws a clear error when the AI was constructed without an EngineCatalog', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.catalog()).toThrow(/requires an AI built with an EngineCatalog/i);
    });

    it('returns the exact EngineCatalog instance the AI was constructed with', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const catalog = new EngineCatalog();
      const ai = new AI(kernel, undefined, undefined, undefined, undefined, catalog);

      expect(ai.catalog()).toBe(catalog);
    });
  });

  describe('tools()', () => {
    it('throws a clear error when the AI was constructed without a tool registry', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const ai = new AI(kernel);

      expect(() => ai.tools()).toThrow(/requires an AI built with a tool registry/i);
    });

    it('returns the exact ToolRegistry instance the AI was constructed with', () => {
      const kernel = new Aidex({ provider: new StubProvider() });
      const toolRegistry = new ToolRegistry();
      const ai = new AI(kernel, undefined, undefined, undefined, undefined, undefined, toolRegistry);

      expect(ai.tools()).toBe(toolRegistry);
    });
  });
});
