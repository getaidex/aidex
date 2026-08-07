import type {
  Connection,
  ConnectionManager,
  RegisterConnectionInput,
  UpdateConnectionInput,
} from '@aidex/connections';
import type { AIControlState, AIFeatureControl } from '@aidex/ai-control';
import { ObservabilityEventName, type ObservabilityBus } from '@aidex/observability';
import { AdminConfigurationError } from './errors/AdminConfigurationError.js';
import type { AdminHealthStatus, AdminSnapshot, ObservabilitySummary } from './types/AdminSnapshot.js';

export interface AdminControllerConfig {
  connectionManager: ConnectionManager;
  aiControl: AIFeatureControl;
  observability?: ObservabilityBus;
}

type AdminSnapshotListener = (snapshot: AdminSnapshot) => void;

function readEventNumber(metadata: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * The framework-agnostic composition layer over @aidex/connections,
 * @aidex/ai-control, and @aidex/observability. Owns no state itself — every
 * read goes straight to the underlying manager/control/bus instance the
 * application already constructed and handed to Aidex; every command is a
 * thin, validated pass-through to the same instance. See ADR-003.
 */
export class AdminController {
  private readonly connectionManager: ConnectionManager;
  private readonly aiControl: AIFeatureControl;
  private readonly observability?: ObservabilityBus;
  private readonly listeners = new Set<AdminSnapshotListener>();
  private lastEventAt?: string;

  constructor(config: AdminControllerConfig) {
    if (!config?.connectionManager) {
      throw new AdminConfigurationError('AdminController requires a connectionManager.');
    }
    if (!config?.aiControl) {
      throw new AdminConfigurationError('AdminController requires an aiControl.');
    }

    this.connectionManager = config.connectionManager;
    this.aiControl = config.aiControl;
    this.observability = config.observability;

    // Reuses ObservabilityBus's existing subscribe() — no second event bus.
    // This is the one piece of state AdminController tracks itself (see
    // ObservabilitySummary.lastEventAt's doc comment for why), plus it's
    // what lets Admin's own subscribers react to observability activity.
    this.observability?.subscribe(() => {
      this.lastEventAt = new Date().toISOString();
      this.notify();
    });
  }

  getSnapshot(): AdminSnapshot {
    const connections = this.connectionManager.list();
    const aiControlState = this.aiControl.getState();

    return {
      connections,
      aiControl: aiControlState,
      observability: this.summarizeObservability(),
      health: this.deriveHealth(connections, aiControlState),
    };
  }

  /** Returns an unsubscribe function. Fires after every command, and after every observability event when observability is supplied. */
  subscribe(listener: AdminSnapshotListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  registerConnection(input: RegisterConnectionInput): Connection {
    const connection = this.connectionManager.register(input);
    this.notify();
    return connection;
  }

  updateConnection(id: string, input: UpdateConnectionInput): Connection {
    const connection = this.connectionManager.update(id, input);
    this.notify();
    return connection;
  }

  enableConnection(id: string): Connection {
    const connection = this.connectionManager.enable(id);
    this.notify();
    return connection;
  }

  disableConnection(id: string): Connection {
    const connection = this.connectionManager.disable(id);
    this.notify();
    return connection;
  }

  removeConnection(id: string): boolean {
    const removed = this.connectionManager.remove(id);
    this.notify();
    return removed;
  }

  setAIEnabled(enabled: boolean): void {
    this.aiControl.setEnabled(enabled);
    this.notify();
  }

  setFeatureEnabled(feature: string, enabled: boolean): void {
    this.aiControl.setFeatureEnabled(feature, enabled);
    this.notify();
  }

  clearFeatureOverride(feature: string): void {
    this.aiControl.clearFeatureOverride(feature);
    this.notify();
  }

  private notify(): void {
    if (this.listeners.size === 0) {
      return;
    }
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  private summarizeObservability(): ObservabilitySummary {
    if (!this.observability) {
      return { errorCount: 0 };
    }

    let totalTokens: number | undefined;
    let totalCostUsd: number | undefined;
    let errorCount = 0;

    for (const event of this.observability.getTimeline()) {
      if (event.event === ObservabilityEventName.TOKENS) {
        const tokens = readEventNumber(event.metadata, 'totalTokens');
        if (tokens !== undefined) {
          totalTokens = (totalTokens ?? 0) + tokens;
        }
      } else if (event.event === ObservabilityEventName.COST) {
        const cost = readEventNumber(event.metadata, 'totalCost');
        if (cost !== undefined) {
          totalCostUsd = (totalCostUsd ?? 0) + cost;
        }
      } else if (event.event === ObservabilityEventName.ERROR) {
        errorCount += 1;
      }
    }

    return { totalTokens, totalCostUsd, errorCount, lastEventAt: this.lastEventAt };
  }

  private deriveHealth(connections: readonly Connection[], aiControlState: AIControlState): AdminHealthStatus {
    if (!aiControlState.enabled) {
      return 'ai-disabled';
    }
    if (connections.length > 0 && connections.every((connection) => !connection.enabled)) {
      return 'no-enabled-connections';
    }
    return 'ok';
  }
}
