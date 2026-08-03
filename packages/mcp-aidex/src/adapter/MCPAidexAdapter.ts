import type { Engine } from '@aidex/engines';
import type { MCPAidexAdapterConfig } from '../types/MCPAidexAdapterConfig.js';
import { EngineToMCPToolAdapter } from './EngineToMCPToolAdapter.js';

/**
 * Registers Engine-backed MCP tools into an existing `MCPServer`. Owns
 * the registration *lifecycle* — `register`/`unregister`/`has`/`list`,
 * kept in sync with `mcpServer.tools` — but never the actual
 * Engine→MCPTool conversion: that's `EngineToMCPToolAdapter`'s job
 * exclusively, delegated to one internal instance this class owns.
 *
 * Registration never executes anything. `registerEngine()` only builds
 * a tool object (a pure, synchronous conversion) and registers it —
 * `Engine.execute()` only ever runs later, when a client actually calls
 * that tool through `mcpServer`.
 *
 * `engines` and `mcpServer.tools` are kept synchronized by construction:
 * every mutating method here touches both, in an order that never leaves
 * one updated without the other (`registerEngine()` registers into
 * `mcpServer.tools` *before* recording the engine locally, so a
 * `DuplicateRegistrationError` from the registry — the same class every
 * registry in this platform throws — never leaves this adapter's own
 * bookkeeping out of sync).
 */
export class MCPAidexAdapter {
  private readonly mcpServer: MCPAidexAdapterConfig['mcpServer'];
  private readonly toolAdapter: EngineToMCPToolAdapter;
  private readonly engines = new Map<string, Engine>();

  constructor(config: MCPAidexAdapterConfig) {
    this.mcpServer = config.mcpServer;
    this.toolAdapter = new EngineToMCPToolAdapter({ context: config.context });
  }

  registerEngine(engine: Engine): void {
    const tool = this.toolAdapter.adapt(engine);
    this.mcpServer.tools.register(tool);
    this.engines.set(engine.id, engine);
  }

  /** Registers each engine in order; stops at the first failure (e.g. a duplicate id), the same fail-fast behavior every sequential operation in this platform follows — engines registered before the failure remain registered. */
  registerEngines(engines: readonly Engine[]): void {
    for (const engine of engines) {
      this.registerEngine(engine);
    }
  }

  unregisterEngine(engineId: string): boolean {
    const existed = this.engines.delete(engineId);
    this.mcpServer.tools.unregister(engineId);
    return existed;
  }

  hasEngine(engineId: string): boolean {
    return this.engines.has(engineId);
  }

  /** Unregisters every currently-registered engine, leaving both this adapter and `mcpServer.tools` empty of adapter-registered tools. */
  clear(): void {
    for (const engineId of this.engines.keys()) {
      this.mcpServer.tools.unregister(engineId);
    }
    this.engines.clear();
  }

  listRegisteredEngines(): Engine[] {
    return Array.from(this.engines.values());
  }
}
