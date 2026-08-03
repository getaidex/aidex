import { StubPlugin } from '@aidex/plugins';
import { StubProvider } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import { AI } from '../AI.js';
import { AIBuilder } from './AIBuilder.js';
// Imported from '@aidex/sdk' itself (not '@aidex/core') to prove the
// re-exported types are usable end-to-end without ever touching the kernel
// package directly.
import type { Plugin as SDKPlugin, Provider as SDKProvider } from '../index.js';
import { MissingProviderError } from '../errors/MissingProviderError.js';
import { DuplicateRegistrationError } from '@aidex/core';
import type { ExecutionContext, Plugin, Strategy } from '@aidex/core';
import { EngineNotFoundError, UnsupportedProviderCapabilityError, type Engine } from '@aidex/engines';
import { ProviderCapability } from '@aidex/providers';
import { Workflow, WorkflowNotFoundError } from '@aidex/workflow';
import type { AidexWorkflowContext } from '../workflow/WorkflowHandle.js';
import { PromptRegistry, type PromptTemplate } from '@aidex/prompts';
import { EngineCatalog } from '@aidex/catalog';
import { ToolRegistry, type Tool } from '@aidex/tools';
import type { EngineMetadata } from '@aidex/catalog';
import type { FeaturePackage } from '../featurePackage/FeaturePackage.js';
import type { ExtendedPlugin } from '@aidex/plugins';

describe('AIBuilder', () => {
  it('throws a descriptive error from build() when no provider was configured', () => {
    expect(() => new AIBuilder().build()).toThrow(/requires a provider/i);
  });

  it('throws a MissingProviderError specifically when no provider was configured', () => {
    expect(() => new AIBuilder().build()).toThrow(MissingProviderError);
  });

  it('still requires a provider even when a plugin was configured first', () => {
    const builder = new AIBuilder().plugin(new StubPlugin());
    expect(() => builder.build()).toThrow(/requires a provider/i);
  });

  it('build() returns an AI instance once a provider is configured via provider()', () => {
    const ai = new AIBuilder().provider(new StubProvider()).build();
    expect(ai).toBeInstanceOf(AI);
  });

  it('accepts an initial provider via the constructor AIConfiguration', () => {
    const ai = new AIBuilder({ provider: new StubProvider() }).build();
    expect(ai).toBeInstanceOf(AI);
  });

  it('is fluent — provider()/plugin() both return the same builder instance', () => {
    const builder = new AIBuilder();
    expect(builder.provider(new StubProvider())).toBe(builder);
    expect(builder.plugin(new StubPlugin())).toBe(builder);
  });

  describe('provider registration', () => {
    it('wires the configured provider through to text() — StubProvider deterministically echoes the input', async () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      const result = await ai.text('hello');

      expect(result).toBe('stub:hello');
    });
  });

  describe('plugin registration', () => {
    it('registers a plugin passed via plugin() through AidexConfig.plugins (onReady fires at build time)', async () => {
      const plugin = new StubPlugin();
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(plugin.calls).toEqual(['onReady']);

      await ai.text('hi');

      expect(plugin.calls).toEqual(['onReady', 'beforeExecute', 'afterExecute']);
    });

    it('registers plugins supplied via the constructor AIConfiguration', () => {
      const plugin = new StubPlugin();
      new AIBuilder({ provider: new StubProvider(), plugins: [plugin] }).build();

      expect(plugin.calls).toEqual(['onReady']);
    });

    it('registers plugins from both the constructor and plugin() together', async () => {
      const fromConfig = new StubPlugin();
      const calls: string[] = [];
      const fromMethod = {
        name: 'from-method',
        beforeExecute: () => {
          calls.push('beforeExecute');
        },
        afterExecute: () => {
          calls.push('afterExecute');
        },
      };
      const ai = new AIBuilder({ provider: new StubProvider(), plugins: [fromConfig] })
        .plugin(fromMethod)
        .build();

      await ai.text('hi');

      expect(fromConfig.calls).toEqual(['onReady', 'beforeExecute', 'afterExecute']);
      expect(calls).toEqual(['beforeExecute', 'afterExecute']);
    });
  });

  describe('strategy auto-registration', () => {
    it('auto-registers the real TextGenerationStrategy — its own input validation is genuinely wired', async () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      await expect(
        ai.execute({ strategy: 'text-generation', input: '' })
      ).rejects.toThrow(/non-empty string/i);
    });
  });

  describe('re-exported Provider/Plugin types (@aidex/sdk, not @aidex/core)', () => {
    it('a custom object typed via the SDK-exported Provider is accepted by .provider()', async () => {
      const customProvider: SDKProvider = {
        name: 'custom',
        async generate(prompt) {
          return { content: `custom:${prompt.content}` };
        },
      };

      const ai = new AIBuilder().provider(customProvider).build();

      expect(await ai.text('hello')).toBe('custom:hello');
    });

    it('a custom object typed via the SDK-exported Plugin is accepted by .plugin()', async () => {
      const calls: string[] = [];
      const customPlugin: SDKPlugin = {
        name: 'custom-plugin',
        beforeExecute: () => {
          calls.push('beforeExecute');
        },
      };

      const ai = new AIBuilder().provider(new StubProvider()).plugin(customPlugin).build();
      await ai.text('hi');

      expect(calls).toEqual(['beforeExecute']);
    });

    it('the SDK-exported Provider/Plugin types also work via the constructor AIConfiguration', () => {
      const provider: SDKProvider = new StubProvider();
      const plugin: SDKPlugin = new StubPlugin();

      expect(() => new AIBuilder({ provider, plugins: [plugin] }).build()).not.toThrow();
    });
  });

  describe('engine registration', () => {
    it('registers an engine via engine() and executes it through AI.engine(id).execute()', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .engine({
          id: 'document.extract',
          name: 'document.extract',
          description: 'test',
          version: '1.0.0',
          async execute(context) {
            return `extracted:${(context.request as { input?: unknown } | undefined)?.input}`;
          },
        })
        .build();

      const result = await ai.engine('document.extract').execute('hello.pdf');

      expect(result).toBe('extracted:hello.pdf');
    });

    it('is fluent — engine() returns the same builder instance', () => {
      const builder = new AIBuilder();

      expect(
        builder.engine({
          id: 'x',
          name: 'x',
          description: 'x',
          version: '1.0.0',
          async execute() {
            return null;
          },
        })
      ).toBe(builder);
    });

    it('rejects with EngineNotFoundError when the engine id was never registered', async () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      await expect(ai.engine('missing').execute('x')).rejects.toBeInstanceOf(EngineNotFoundError);
    });

    it('rejects with UnsupportedProviderCapabilityError when the provider lacks a required capability', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .engine({
          id: 'needs.streaming',
          name: 'needs.streaming',
          description: 'test',
          version: '1.0.0',
          requiredCapabilities: [ProviderCapability.Streaming],
          async execute() {
            return null;
          },
        })
        .build();

      await expect(ai.engine('needs.streaming').execute('x')).rejects.toBeInstanceOf(
        UnsupportedProviderCapabilityError
      );
    });

    it('propagates the exact configured provider through ExecutionContext to the engine', async () => {
      const provider = new StubProvider();
      let seenContext: ExecutionContext | undefined;
      const ai = new AIBuilder()
        .provider(provider)
        .engine({
          id: 'inspect',
          name: 'inspect',
          description: 'test',
          version: '1.0.0',
          async execute(context) {
            seenContext = context;
            return null;
          },
        })
        .build();

      await ai.engine('inspect').execute('payload');

      expect(seenContext?.provider).toBe(provider);
      expect(seenContext?.request).toEqual({ strategy: 'inspect', input: 'payload' });
    });

    it('reuses the identical provider instance across two different engines', async () => {
      const provider = new StubProvider();
      const seenProviders: unknown[] = [];
      const ai = new AIBuilder()
        .provider(provider)
        .engine({
          id: 'first',
          name: 'first',
          description: 'test',
          version: '1.0.0',
          async execute(context) {
            seenProviders.push(context.provider);
            return null;
          },
        })
        .engine({
          id: 'second',
          name: 'second',
          description: 'test',
          version: '1.0.0',
          async execute(context) {
            seenProviders.push(context.provider);
            return null;
          },
        })
        .build();

      await ai.engine('first').execute('a');
      await ai.engine('second').execute('b');

      expect(seenProviders[0]).toBe(provider);
      expect(seenProviders[1]).toBe(provider);
    });

    it('does not affect existing text()/execute() behavior when engines are also registered', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .engine({
          id: 'unrelated',
          name: 'unrelated',
          description: 'test',
          version: '1.0.0',
          async execute() {
            return null;
          },
        })
        .build();

      expect(await ai.text('hi')).toBe('stub:hi');
    });
  });

  describe('workflow registration', () => {
    interface WorkflowTestState {
      documentId?: string;
    }

    function makeTestWorkflow(
      id: string,
      onExecute: (context: WorkflowTestState & { $aidex: AidexWorkflowContext }) => void
    ): Workflow<WorkflowTestState & { $aidex: AidexWorkflowContext }> {
      const workflow = new Workflow<WorkflowTestState & { $aidex: AidexWorkflowContext }>(id);
      workflow.addStep({
        name: 'record',
        async execute(context) {
          onExecute(context);
        },
      });
      return workflow;
    }

    it('registers a workflow via workflow() and executes it through AI.workflow(id).execute()', async () => {
      let seenDocumentId: string | undefined;
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .workflow(
          makeTestWorkflow('resume-review', (context) => {
            seenDocumentId = context.documentId;
          })
        )
        .build();

      await ai.workflow<WorkflowTestState>('resume-review').execute({ documentId: 'doc-1' });

      expect(seenDocumentId).toBe('doc-1');
    });

    it('is fluent — workflow() returns the same builder instance', () => {
      const builder = new AIBuilder();

      expect(builder.workflow(makeTestWorkflow('x', () => {}))).toBe(builder);
    });

    it('rejects with WorkflowNotFoundError when the workflow id was never registered', async () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      await expect(ai.workflow('missing').execute()).rejects.toBeInstanceOf(WorkflowNotFoundError);
    });

    it('propagates the exact configured provider through $aidex to the workflow step', async () => {
      const provider = new StubProvider();
      let seenProvider: unknown;
      const ai = new AIBuilder()
        .provider(provider)
        .workflow(
          makeTestWorkflow('inspect', (context) => {
            seenProvider = context.$aidex.provider;
          })
        )
        .build();

      await ai.workflow('inspect').execute();

      expect(seenProvider).toBe(provider);
    });

    it('reuses the identical provider instance across two different workflows', async () => {
      const provider = new StubProvider();
      const seenProviders: unknown[] = [];
      const ai = new AIBuilder()
        .provider(provider)
        .workflow(
          makeTestWorkflow('first', (context) => seenProviders.push(context.$aidex.provider))
        )
        .workflow(
          makeTestWorkflow('second', (context) => seenProviders.push(context.$aidex.provider))
        )
        .build();

      await ai.workflow('first').execute();
      await ai.workflow('second').execute();

      expect(seenProviders[0]).toBe(provider);
      expect(seenProviders[1]).toBe(provider);
    });

    it('does not let a workflow step mutate $aidex', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .workflow(
          makeTestWorkflow('try-mutate', (context) => {
            expect(() => {
              (context.$aidex as { provider: unknown }).provider = null;
            }).toThrow();
          })
        )
        .build();

      await expect(ai.workflow('try-mutate').execute()).resolves.toBeDefined();
    });

    it('does not affect existing text()/execute() behavior when workflows are also registered', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .workflow(makeTestWorkflow('unrelated', () => {}))
        .build();

      expect(await ai.text('hi')).toBe('stub:hi');
    });
  });

  describe('prompt registration', () => {
    it('registers a prompt via prompt() and renders it through AI.renderPrompt()', () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .prompt({ id: 'greeting', version: '1.0.0', template: 'Hello, {{name}}!', variables: ['name'] })
        .build();

      expect(ai.renderPrompt('greeting', { name: 'Ada' })).toBe('Hello, Ada!');
    });

    it('is fluent — prompt() returns the same builder instance', () => {
      const builder = new AIBuilder();

      expect(builder.prompt({ id: 'x', version: '1.0.0', template: 'x' })).toBe(builder);
    });
  });

  describe('catalog and prompt registry access', () => {
    it('exposes a real EngineCatalog through AI.catalog()', () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      expect(ai.catalog()).toBeInstanceOf(EngineCatalog);
    });

    it('exposes a real PromptRegistry through AI.prompts()', () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      expect(ai.prompts()).toBeInstanceOf(PromptRegistry);
    });
  });

  describe('tool registration', () => {
    it('registers a tool via tool() and executes it through AI.tools().execute()', async () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .tool({
          id: 'calculator',
          name: 'calculator',
          description: 'test tool',
          async execute() {
            return 'ran:calculator';
          },
        })
        .build();

      expect(await ai.tools().execute('calculator', {})).toBe('ran:calculator');
    });

    it('is fluent — tool() returns the same builder instance', () => {
      const builder = new AIBuilder();

      expect(
        builder.tool({
          id: 'x',
          name: 'x',
          description: 'x',
          async execute() {
            return null;
          },
        })
      ).toBe(builder);
    });

    it('exposes a real ToolRegistry through AI.tools()', () => {
      const ai = new AIBuilder().provider(new StubProvider()).build();

      expect(ai.tools()).toBeInstanceOf(ToolRegistry);
    });
  });

  describe('use() — feature package registration', () => {
    function makeFeaturePackage(overrides: Partial<FeaturePackage> = {}): FeaturePackage {
      return {
        name: '@aidex/test-pack',
        version: '1.0.0',
        ...overrides,
      };
    }

    it('is fluent — use() returns the same builder instance', () => {
      const builder = new AIBuilder();

      expect(builder.use(makeFeaturePackage())).toBe(builder);
    });

    it('registering an empty/all-fields-omitted FeaturePackage does nothing and does not throw', () => {
      expect(() =>
        new AIBuilder().provider(new StubProvider()).use(makeFeaturePackage()).build()
      ).not.toThrow();
    });

    it('registers every engine from featurePackage.engines and makes it dispatchable via AI.engine()', async () => {
      const engine: Engine = {
        id: 'test.engine',
        name: 'Test',
        description: 'test',
        version: '1.0.0',
        async execute() {
          return 'ran';
        },
      };
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .use(makeFeaturePackage({ engines: [engine] }))
        .build();

      expect(await ai.engine('test.engine').execute('x')).toBe('ran');
    });

    it('registers every prompt from featurePackage.prompts and makes it renderable via AI.renderPrompt()', () => {
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .use(
          makeFeaturePackage({
            prompts: [{ id: 'greeting', version: '1.0.0', template: 'hi {{name}}', variables: ['name'] }],
          })
        )
        .build();

      expect(ai.renderPrompt('greeting', { name: 'Ada' })).toBe('hi Ada');
    });

    it('registers every plugin from featurePackage.plugins', async () => {
      const calls: string[] = [];
      const plugin: Plugin = {
        name: 'test-plugin',
        beforeExecute: () => {
          calls.push('beforeExecute');
        },
      };
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .use(makeFeaturePackage({ plugins: [plugin] }))
        .build();

      await ai.text('hi');

      expect(calls).toEqual(['beforeExecute']);
    });

    it('registers every metadata entry from featurePackage.metadata into the catalog', () => {
      const metadata: EngineMetadata = {
        id: 'test.engine',
        name: 'Test',
        featurePack: '@aidex/test-pack',
        version: '1.0.0',
        description: 'test',
        requestType: 'X',
        responseType: 'Y',
        tags: [],
        category: 'testing',
      };
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .use(makeFeaturePackage({ metadata: [metadata] }))
        .build();

      expect(ai.catalog().find('test.engine')).toEqual(metadata);
    });

    it('does not register anything from featurePackage.workflows into WorkflowRegistry', async () => {
      const fakeWorkflow = {
        id: 'fake-workflow',
        run: () => {
          throw new Error('should never be called');
        },
      };
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .use(makeFeaturePackage({ workflows: [fakeWorkflow] }))
        .build();

      await expect(ai.workflow('fake-workflow').execute()).rejects.toBeInstanceOf(WorkflowNotFoundError);
    });

    it('propagates DuplicateRegistrationError when a featurePackage engine id collides with an already-registered one', () => {
      const engine: Engine = {
        id: 'dup',
        name: 'Dup',
        description: 'd',
        version: '1.0.0',
        async execute() {
          return null;
        },
      };
      const builder = new AIBuilder().provider(new StubProvider()).engine(engine);
      const otherEngine: Engine = { ...engine };

      expect(() => builder.use(makeFeaturePackage({ engines: [otherEngine] }))).toThrow(
        DuplicateRegistrationError
      );
    });
  });

  describe('plugin registration — ExtendedPlugin bulk registration', () => {
    function makeBulkEngine(id: string): Engine {
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

    function makeBulkStrategy(name: string): Strategy<string> {
      return {
        name,
        async execute(request) {
          return `strategy:${name}:${String(request.input)}`;
        },
      };
    }

    function makeBulkPrompt(id: string): PromptTemplate {
      return { id, version: '1.0.0', template: `Hello, ${id}!` };
    }

    function makeBulkTool(id: string): Tool {
      return {
        id,
        name: id,
        description: `Test tool "${id}"`,
        async execute() {
          return `ran:${id}`;
        },
      };
    }

    it('registers engines an ExtendedPlugin declares, dispatchable via AI.engine()', async () => {
      const plugin: ExtendedPlugin = {
        name: 'engine-plugin',
        registerEngines: () => [makeBulkEngine('bulk.engine')],
      };
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(await ai.engine('bulk.engine').execute('x')).toBe('ran:bulk.engine');
    });

    it('propagates a duplicate engine id as the same DuplicateRegistrationError .engine() would throw', () => {
      const builder = new AIBuilder().provider(new StubProvider()).engine(makeBulkEngine('shared'));

      expect(() =>
        builder.plugin({ name: 'dup-plugin', registerEngines: () => [makeBulkEngine('shared')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('registers prompts an ExtendedPlugin declares, renderable via AI.renderPrompt()', () => {
      const plugin: ExtendedPlugin = {
        name: 'prompt-plugin',
        registerPrompts: () => [makeBulkPrompt('bulk-greeting')],
      };
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(ai.renderPrompt('bulk-greeting')).toBe('Hello, bulk-greeting!');
    });

    it('propagates a duplicate prompt id+version as the same DuplicateRegistrationError .prompt() would throw', () => {
      const builder = new AIBuilder()
        .provider(new StubProvider())
        .prompt(makeBulkPrompt('shared-prompt'));

      expect(() =>
        builder.plugin({ name: 'dup-plugin', registerPrompts: () => [makeBulkPrompt('shared-prompt')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('registers tools an ExtendedPlugin declares, executable via AI.tools()', async () => {
      const plugin: ExtendedPlugin = {
        name: 'tool-plugin',
        registerTools: () => [makeBulkTool('bulk.tool')],
      };
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(await ai.tools().execute('bulk.tool', {})).toBe('ran:bulk.tool');
    });

    it('propagates a duplicate tool id as the same DuplicateRegistrationError .tool() would throw', () => {
      const builder = new AIBuilder().provider(new StubProvider()).tool(makeBulkTool('shared-tool'));

      expect(() =>
        builder.plugin({ name: 'dup-plugin', registerTools: () => [makeBulkTool('shared-tool')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('registers strategies an ExtendedPlugin declares, dispatchable via AI.execute()', async () => {
      const plugin: ExtendedPlugin = {
        name: 'strategy-plugin',
        registerStrategies: () => [makeBulkStrategy('bulk-strategy')],
      };
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(await ai.execute({ strategy: 'bulk-strategy', input: 'hi' })).toBe(
        'strategy:bulk-strategy:hi'
      );
    });

    it('throws DuplicateRegistrationError immediately at plugin()-call time for a duplicate strategy name', () => {
      const builder = new AIBuilder().provider(new StubProvider());
      builder.plugin({ name: 'first', registerStrategies: () => [makeBulkStrategy('shared-strategy')] });

      expect(() =>
        builder.plugin({ name: 'second', registerStrategies: () => [makeBulkStrategy('shared-strategy')] })
      ).toThrow(DuplicateRegistrationError);
    });

    it('throws DuplicateRegistrationError immediately at plugin()-call time for the reserved "text-generation" strategy name', () => {
      const builder = new AIBuilder().provider(new StubProvider());

      expect(() =>
        builder.plugin({
          name: 'text-gen-plugin',
          registerStrategies: () => [
            {
              name: 'text-generation',
              async execute() {
                return null;
              },
            },
          ],
        })
      ).toThrow(DuplicateRegistrationError);
    });

    it('replays accumulated strategies onto the kernel in registration order, alongside the auto-registered TextGenerationStrategy', async () => {
      const order: string[] = [];
      const ai = new AIBuilder()
        .provider(new StubProvider())
        .plugin({
          name: 'first',
          registerStrategies: () => [
            {
              name: 'alpha',
              async execute() {
                order.push('alpha');
                return null;
              },
            },
          ],
        })
        .plugin({
          name: 'second',
          registerStrategies: () => [
            {
              name: 'beta',
              async execute() {
                order.push('beta');
                return null;
              },
            },
          ],
        })
        .build();

      await ai.execute({ strategy: 'alpha' });
      await ai.execute({ strategy: 'beta' });

      expect(order).toEqual(['alpha', 'beta']);
      await expect(ai.execute({ strategy: 'text-generation', input: '' })).rejects.toThrow(
        /non-empty string/i
      );
    });

    it('does not affect existing plain-Plugin lifecycle behavior when installed via plugin()', async () => {
      const plugin = new StubPlugin();
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(plugin.calls).toEqual(['onReady']);

      await ai.text('hi');

      expect(plugin.calls).toEqual(['onReady', 'beforeExecute', 'afterExecute']);
    });

    it('is fluent — plugin() with an ExtendedPlugin still returns the same builder instance', () => {
      const builder = new AIBuilder();
      const plugin: ExtendedPlugin = { name: 'x' };

      expect(builder.plugin(plugin)).toBe(builder);
    });

    it('registers all four ExtendedPlugin bulk-registration kinds declared on a single plugin, each dispatchable on the built AI', async () => {
      const plugin: ExtendedPlugin = {
        name: 'combined-plugin',
        registerEngines: () => [makeBulkEngine('combined.engine')],
        registerStrategies: () => [makeBulkStrategy('combined-strategy')],
        registerPrompts: () => [makeBulkPrompt('combined.prompt')],
        registerTools: () => [makeBulkTool('combined.tool')],
      };
      const ai = new AIBuilder().provider(new StubProvider()).plugin(plugin).build();

      expect(await ai.engine('combined.engine').execute('x')).toBe('ran:combined.engine');
      expect(await ai.execute({ strategy: 'combined-strategy', input: 'hi' })).toBe(
        'strategy:combined-strategy:hi'
      );
      expect(ai.renderPrompt('combined.prompt')).toBe('Hello, combined.prompt!');
      expect(await ai.tools().execute('combined.tool', {})).toBe('ran:combined.tool');
    });
  });
});
