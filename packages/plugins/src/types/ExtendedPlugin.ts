import type { Plugin, Strategy } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { PromptTemplate } from '@aidex/prompts';
import type { Tool } from '@aidex/tools';

/**
 * The extended plugin contract for the Aidex Plugin System: everything a
 * regular @aidex/core Plugin already does (the five lifecycle hooks), plus
 * optional methods declaring Engines/Strategies/Prompts/Tools this plugin
 * wants installed. Every method is optional — a plugin implements any
 * subset, exactly like the base Plugin's lifecycle hooks. Extends Plugin
 * rather than replacing it, so an ExtendedPlugin is always a valid Plugin
 * too and existing lifecycle wiring (Aidex.use()) keeps working unchanged.
 *
 * registerPrompts()/registerTools() return the real PromptTemplate/Tool
 * shapes from @aidex/prompts/@aidex/tools — PluginManager registers them
 * directly into a PromptRegistry/ToolRegistry, it no longer just collects
 * placeholder declarations.
 */
export interface ExtendedPlugin extends Plugin {
  registerEngines?(): Engine[];
  registerStrategies?(): Strategy[];
  registerPrompts?(): PromptTemplate[];
  registerTools?(): Tool[];
}
