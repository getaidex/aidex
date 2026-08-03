import { Aidex, DuplicateRegistrationError, type AidexConfig, type Plugin, type Provider, type Strategy } from '@aidex/core';
import { EngineRegistry, type Engine } from '@aidex/engines';
import { TextGenerationStrategy } from '@aidex/strategies';
import { WorkflowRegistry, type Workflow } from '@aidex/workflow';
import { PromptRegistry, type PromptTemplate } from '@aidex/prompts';
import { EngineCatalog } from '@aidex/catalog';
import { ToolRegistry, type Tool } from '@aidex/tools';
import type { ExtendedPlugin } from '@aidex/plugins';
import type { AIConfiguration } from '../configuration/AIConfiguration.js';
import { AI } from '../AI.js';
import { MissingProviderError } from '../errors/MissingProviderError.js';
import type { FeaturePackage } from '../featurePackage/FeaturePackage.js';

/**
 * Builder pattern over Aidex. Owns assembly only — never execution. Composes
 * the kernel's own public API (AidexConfig.provider/plugins,
 * registerStrategy()) exactly the way application code would; it never
 * reimplements dispatch, lifecycle, or registry logic. No singleton, no
 * static/global state: every AIBuilder is an independent instance.
 *
 * build() auto-registers @aidex/strategies' TextGenerationStrategy under the
 * "text-generation" name so AI.text() works without the developer ever
 * calling registerStrategy() themselves — this is the one piece of
 * kernel/strategy wiring this façade hides.
 *
 * engine() accumulates Engines into a private EngineRegistry, handed to AI
 * at build() time alongside the same AidexConfig used to construct the
 * kernel — so AI.engine(id).execute() dispatches through the identical
 * EngineRegistry.execute() (capability validation included) with the exact
 * same provider/plugins/metadata this builder was configured with.
 *
 * workflow() accumulates Workflows into a private WorkflowRegistry, handed
 * to AI at build() time alongside the same EngineRegistry and AidexConfig —
 * so AI.workflow(id).execute() dispatches through the identical
 * WorkflowRegistry.execute() with the exact same provider this builder was
 * configured with, injected under the reserved $aidex key.
 *
 * prompt() accumulates PromptTemplates into a private PromptRegistry;
 * tool() accumulates Tools into a private ToolRegistry; AIBuilder also owns
 * a private EngineCatalog for discoverable metadata. All three are handed
 * to AI at build() time alongside the existing EngineRegistry/
 * WorkflowRegistry/AidexConfig, so AI.renderPrompt()/.prompts()/.catalog()/
 * .tools() dispatch through the identical registry instances this builder
 * assembled.
 *
 * plugin() pushes onto a private Plugin[] fed into AidexConfig.plugins,
 * unchanged from before — Aidex's own constructor already calls use(plugin)
 * once per config.plugins entry, wiring lifecycle hooks. Additionally, if a
 * plugin declares any @aidex/plugins' ExtendedPlugin bulk-registration
 * methods (registerEngines/registerStrategies/registerPrompts/
 * registerTools), each declared item is fanned out through this builder's
 * own single-item methods (engine()/prompt()/tool()) — the same reuse
 * pattern use(featurePackage) established for FeaturePackage. Strategies
 * have no public single-item method, so they go directly into a private
 * _strategies collection, keyed by strategy.name (matching the kernel's own
 * convention), with immediate duplicate validation; build() replays them
 * onto the kernel, in insertion order, right after the auto-registered
 * TextGenerationStrategy.
 *
 * AIBuilder deliberately never instantiates @aidex/plugins' PluginManager:
 * PluginManager's constructor requires an already-built Aidex, which doesn't
 * exist until build() runs, and calling PluginManager.use() afterward would
 * call aidex.use(plugin) a second time — Aidex's constructor already calls it
 * once per config.plugins entry — duplicating lifecycle-hook execution.
 * This builder therefore reproduces only PluginManager's registration
 * fan-out (routed through its own public methods), without reusing the
 * PluginManager object itself. PluginManager remains the correct,
 * unmodified composition point for applications holding a raw Aidex
 * instance directly.
 */
export class AIBuilder {
  private _provider?: Provider;
  private readonly _plugins: Plugin[];
  private readonly _engineRegistry = new EngineRegistry();
  private readonly _workflowRegistry = new WorkflowRegistry();
  private readonly _promptRegistry = new PromptRegistry();
  private readonly _catalog = new EngineCatalog();
  private readonly _toolRegistry = new ToolRegistry();
  private readonly _strategies = new Map<string, Strategy>();

  constructor(configuration?: AIConfiguration) {
    this._provider = configuration?.provider;
    this._plugins = [...(configuration?.plugins ?? [])];
  }

  provider(provider: Provider): this {
    this._provider = provider;
    return this;
  }

  plugin(plugin: Plugin): this {
    this._plugins.push(plugin);

    const extended = plugin as ExtendedPlugin;
    for (const engine of extended.registerEngines?.() ?? []) {
      this.engine(engine);
    }
    for (const prompt of extended.registerPrompts?.() ?? []) {
      this.prompt(prompt);
    }
    for (const tool of extended.registerTools?.() ?? []) {
      this.tool(tool);
    }
    for (const strategy of extended.registerStrategies?.() ?? []) {
      if (strategy.name === 'text-generation' || this._strategies.has(strategy.name)) {
        throw new DuplicateRegistrationError('Strategy', strategy.name);
      }
      this._strategies.set(strategy.name, strategy);
    }

    return this;
  }

  engine(engine: Engine): this {
    this._engineRegistry.register(engine);
    return this;
  }

  workflow(workflow: Workflow): this {
    this._workflowRegistry.register(workflow);
    return this;
  }

  prompt(prompt: PromptTemplate): this {
    this._promptRegistry.register(prompt);
    return this;
  }

  tool(tool: Tool): this {
    this._toolRegistry.register(tool);
    return this;
  }

  use(featurePackage: FeaturePackage): this {
    for (const engine of featurePackage.engines ?? []) {
      this.engine(engine);
    }
    for (const prompt of featurePackage.prompts ?? []) {
      this.prompt(prompt);
    }
    for (const plugin of featurePackage.plugins ?? []) {
      this.plugin(plugin);
    }
    for (const metadata of featurePackage.metadata ?? []) {
      this._catalog.register(metadata);
    }
    // featurePackage.workflows is intentionally NOT touched — see
    // FeaturePackage's doc comment. Feature-pack workflow helpers predate
    // WorkflowRegistry and have their own run(input, provider, options)
    // shape; this method never registers, adapts, or executes them.
    return this;
  }

  build(): AI {
    if (!this._provider) {
      throw new MissingProviderError();
    }

    const config: AidexConfig = { provider: this._provider, plugins: this._plugins };
    const kernel = new Aidex(config);
    kernel.registerStrategy(new TextGenerationStrategy());
    for (const strategy of this._strategies.values()) {
      kernel.registerStrategy(strategy);
    }

    return new AI(
      kernel,
      this._engineRegistry,
      config,
      this._workflowRegistry,
      this._promptRegistry,
      this._catalog,
      this._toolRegistry
    );
  }
}
