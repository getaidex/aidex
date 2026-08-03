import { type Aidex, DuplicateRegistrationError } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { PromptRegistry } from '@aidex/prompts';
import { ToolRegistry } from '@aidex/tools';
import type { ExtendedPlugin } from '../types/ExtendedPlugin.js';

/**
 * The Aidex Plugin System's install point: `use(plugin)` is this package's
 * "aidex.use(plugin)" — it installs an ExtendedPlugin against one Aidex
 * instance, wiring lifecycle hooks (by delegating to the real
 * `aidex.use()`), and registering every declared extension kind into its
 * real, dedicated registry: Engines into EngineRegistry, Strategies onto
 * the Aidex instance itself, Prompts into PromptRegistry, Tools into
 * ToolRegistry. No placeholder collection — every declaration lands in the
 * same registry any other caller would use directly.
 *
 * Independent of application logic: nothing here knows about any specific
 * application, provider vendor, or plugin's business purpose — only the
 * ExtendedPlugin shape and the four registries it composes.
 */
export class PluginManager {
  private readonly installed = new Set<string>();

  constructor(
    private readonly aidex: Aidex,
    private readonly engines: EngineRegistry = new EngineRegistry(),
    private readonly prompts: PromptRegistry = new PromptRegistry(),
    private readonly tools: ToolRegistry = new ToolRegistry()
  ) {}

  use(plugin: ExtendedPlugin): void {
    if (this.installed.has(plugin.name)) {
      throw new DuplicateRegistrationError('Plugin', plugin.name);
    }

    // Lifecycle hooks: delegate to the real kernel wiring, unchanged.
    this.aidex.use(plugin);

    for (const engine of plugin.registerEngines?.() ?? []) {
      this.engines.register(engine);
    }
    for (const strategy of plugin.registerStrategies?.() ?? []) {
      this.aidex.registerStrategy(strategy);
    }
    for (const prompt of plugin.registerPrompts?.() ?? []) {
      this.prompts.register(prompt);
    }
    for (const tool of plugin.registerTools?.() ?? []) {
      this.tools.register(tool);
    }

    this.installed.add(plugin.name);
  }

  isInstalled(name: string): boolean {
    return this.installed.has(name);
  }

  getEngineRegistry(): EngineRegistry {
    return this.engines;
  }

  getPromptRegistry(): PromptRegistry {
    return this.prompts;
  }

  getToolRegistry(): ToolRegistry {
    return this.tools;
  }
}
