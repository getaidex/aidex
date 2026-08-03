import type { Aidex, AidexConfig, AidexRequest } from '@aidex/core';
import type { EngineRegistry } from '@aidex/engines';
import type { WorkflowRegistry } from '@aidex/workflow';
import type { PromptRegistry } from '@aidex/prompts';
import type { EngineCatalog } from '@aidex/catalog';
import type { ToolRegistry } from '@aidex/tools';
import { EngineHandle } from './engine/EngineHandle.js';
import { WorkflowHandle } from './workflow/WorkflowHandle.js';

/**
 * The main SDK façade. Holds exactly one Aidex instance and delegates every
 * call to it — no strategy logic, no provider logic, no business logic of
 * its own. `text()` is a convenience over `execute()` for the one strategy
 * name every AIBuilder-assembled kernel registers: "text-generation".
 *
 * `engineRegistry`/`config`/`workflowRegistry`/`promptRegistry`/
 * `engineCatalog`/`toolRegistry` are all optional so `new AI(kernel)` and
 * `new AI(kernel, engineRegistry, config)` and every other existing call
 * shape — keep compiling and behaving identically. `AIBuilder.build()`
 * always supplies all six; `.engine()`/`.workflow()`/`.renderPrompt()`/
 * `.prompts()`/`.catalog()`/`.tools()` are capabilities that naturally need
 * the fuller construction path.
 */
export class AI {
  constructor(
    private readonly kernel: Aidex,
    private readonly engineRegistry?: EngineRegistry,
    private readonly config?: AidexConfig,
    private readonly workflowRegistry?: WorkflowRegistry,
    private readonly promptRegistry?: PromptRegistry,
    private readonly engineCatalog?: EngineCatalog,
    private readonly toolRegistry?: ToolRegistry
  ) {}

  execute<TResult = unknown, TContext = unknown>(
    request: AidexRequest<TContext>
  ): Promise<TResult> {
    return this.kernel.execute<TResult, TContext>(request);
  }

  text(input: string): Promise<string> {
    return this.kernel.execute<string>({ strategy: 'text-generation', input });
  }

  engine<TResult = unknown, TContext = unknown>(engineId: string): EngineHandle<TResult, TContext> {
    if (!this.engineRegistry || !this.config) {
      throw new Error(
        'AI.engine() requires an AI built with a provider and engine registry — ' +
          'build this AI via AIBuilder (which wires both automatically), or pass ' +
          'an EngineRegistry and AidexConfig explicitly to new AI(kernel, engineRegistry, config).'
      );
    }
    return new EngineHandle<TResult, TContext>(this.engineRegistry, this.config, engineId);
  }

  workflow<TState = Record<string, unknown>>(workflowId: string): WorkflowHandle<TState> {
    if (!this.workflowRegistry || !this.config) {
      throw new Error(
        'AI.workflow() requires an AI built with a provider and workflow registry — ' +
          'build this AI via AIBuilder (which wires both automatically), or pass a ' +
          'WorkflowRegistry and AidexConfig explicitly to ' +
          'new AI(kernel, engineRegistry, config, workflowRegistry).'
      );
    }
    return new WorkflowHandle<TState>(this.workflowRegistry, this.config, workflowId);
  }

  renderPrompt(id: string, variables?: Record<string, string>, version?: string): string {
    if (!this.promptRegistry) {
      throw new Error(
        'AI.renderPrompt() requires an AI built with a prompt registry — ' +
          'build this AI via AIBuilder (which wires it automatically), or pass a ' +
          'PromptRegistry explicitly to ' +
          'new AI(kernel, engineRegistry, config, workflowRegistry, promptRegistry).'
      );
    }
    return this.promptRegistry.render(id, variables, version);
  }

  prompts(): PromptRegistry {
    if (!this.promptRegistry) {
      throw new Error(
        'AI.prompts() requires an AI built with a prompt registry — ' +
          'build this AI via AIBuilder (which wires it automatically), or pass a ' +
          'PromptRegistry explicitly to ' +
          'new AI(kernel, engineRegistry, config, workflowRegistry, promptRegistry).'
      );
    }
    return this.promptRegistry;
  }

  catalog(): EngineCatalog {
    if (!this.engineCatalog) {
      throw new Error(
        'AI.catalog() requires an AI built with an EngineCatalog — ' +
          'build this AI via AIBuilder (which wires it automatically), or pass an ' +
          'EngineCatalog explicitly to ' +
          'new AI(kernel, engineRegistry, config, workflowRegistry, promptRegistry, catalog).'
      );
    }
    return this.engineCatalog;
  }

  tools(): ToolRegistry {
    if (!this.toolRegistry) {
      throw new Error(
        'AI.tools() requires an AI built with a tool registry — ' +
          'build this AI via AIBuilder (which wires it automatically), or pass a ' +
          'ToolRegistry explicitly to ' +
          'new AI(kernel, engineRegistry, config, workflowRegistry, promptRegistry, catalog, toolRegistry).'
      );
    }
    return this.toolRegistry;
  }
}
