import type { Engine } from '@aidex/engines';
import type { EngineRegistryToMCPAdapterConfig } from '../types/EngineRegistryToMCPAdapterConfig.js';
import { MCPAidexAdapter } from './MCPAidexAdapter.js';

/**
 * Bulk-exposes every `Engine` in an existing `EngineRegistry` (the real
 * platform object that holds a collection of engines — `@aidex/core`'s
 * `Aidex` class holds none) through an existing `MCPServer`, automatically.
 *
 * Owns no registration logic of its own: it constructs one
 * `MCPAidexAdapter` internally and every mutating method here is a thin
 * loop around that adapter's own `registerEngine()`/`clear()` — the exact
 * same Engine→MCPTool mapping Phase 2 established, reused unchanged.
 * `EngineToMCPToolAdapter` is never touched directly here; it's
 * `MCPAidexAdapter`'s dependency, not this class's.
 */
export class EngineRegistryToMCPAdapter {
  private readonly engineRegistry: EngineRegistryToMCPAdapterConfig['engineRegistry'];
  private readonly mcpAidexAdapter: MCPAidexAdapter;

  constructor(config: EngineRegistryToMCPAdapterConfig) {
    this.engineRegistry = config.engineRegistry;
    this.mcpAidexAdapter = new MCPAidexAdapter({ mcpServer: config.mcpServer, context: config.context });
  }

  /**
   * Registers every engine currently in the `EngineRegistry` that isn't
   * already registered through this adapter — skipped via
   * `MCPAidexAdapter.hasEngine()`, not by catching a thrown
   * `DuplicateRegistrationError`. Idempotent and safe to call again
   * later (e.g. after more engines were registered into the
   * `EngineRegistry`): a second call only registers what's new,
   * "automatic exposure" that stays in sync rather than a one-shot
   * snapshot that errors on re-use.
   */
  registerAll(): void {
    for (const engine of this.engineRegistry.list()) {
      if (!this.mcpAidexAdapter.hasEngine(engine.id)) {
        this.mcpAidexAdapter.registerEngine(engine);
      }
    }
  }

  /** Unregisters every engine this adapter has registered, cleanly — reuses `MCPAidexAdapter.clear()`, which itself only ever touches what it registered (a tool registered directly on `mcpServer.tools` by anything else is untouched). */
  unregisterAll(): void {
    this.mcpAidexAdapter.clear();
  }

  listRegisteredEngines(): Engine[] {
    return this.mcpAidexAdapter.listRegisteredEngines();
  }
}
