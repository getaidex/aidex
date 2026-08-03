import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { MCPTool } from '@aidex/mcp';
import type { EngineToMCPToolAdapterConfig } from '../types/EngineToMCPToolAdapterConfig.js';
import { InvalidEngineError } from '../errors/InvalidEngineError.js';
import { executeAdaptedEngine } from './executeAdaptedEngine.js';

/**
 * Converts one `Engine` into one `MCPTool` — the only conversion this
 * package performs, and the only place `MCPTool.name`/`.description`
 * are ever assigned. `.name` reuses `Engine.id` and `.description`
 * reuses `Engine.description` directly, never a copy that could drift;
 * "do not duplicate names or descriptions" holds because nothing is
 * duplicated — the built `MCPTool`'s fields are the engine's own field
 * values, read fresh every time `adapt()` runs. `Engine.version` has no
 * equivalent field in `MCPTool` (the MCP tool schema has none) — it
 * stays reachable by keeping the original `Engine` object itself
 * available, which is exactly what `MCPAidexAdapter.listRegisteredEngines()`
 * returns.
 *
 * Keeps the adapter generic: nothing here imports or knows about any
 * specific Feature Pack's Engine class — it only ever uses the `Engine`
 * contract's four fields (`id`/`name`/`description`/`version`) and one
 * method (`execute`).
 */
export class EngineToMCPToolAdapter {
  private readonly context: ExecutionContext;

  constructor(config: EngineToMCPToolAdapterConfig) {
    this.context = config.context;
  }

  adapt(engine: Engine): MCPTool {
    if (typeof engine.id !== 'string' || engine.id.length === 0) {
      throw new InvalidEngineError('Engine.id must be a non-empty string to become an MCPTool name');
    }

    const context = this.context;

    return {
      name: engine.id,
      description: engine.description,
      async execute(input: unknown) {
        return executeAdaptedEngine(engine, input, context);
      },
    };
  }
}
