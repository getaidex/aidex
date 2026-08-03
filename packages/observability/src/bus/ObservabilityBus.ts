import type { CostEstimateInput } from '../cost/CostEstimator.js';
import { estimateCost } from '../cost/CostEstimator.js';
import type { ExecutionMetrics } from '../metrics/ExecutionMetrics.js';
import { Timeline } from '../timeline/Timeline.js';
import type { ObservabilityEvent } from '../types/ObservabilityEvent.js';

/**
 * The well-known event names this bus tracks. Plain string constants, not a
 * closed enum on ObservabilityEvent itself — ObservabilityEvent.event stays
 * a generic string so nothing here needs @aidex/observability's own types to
 * change if a new tracked category is added later.
 */
export const ObservabilityEventName = {
  TOKENS: 'tokens',
  COST: 'cost',
  DURATION: 'duration',
  PROVIDER: 'provider',
  ENGINE: 'engine',
  WORKFLOW: 'workflow',
  ERROR: 'error',
  RETRY: 'retry',
} as const;

export type ObservabilityEventName =
  (typeof ObservabilityEventName)[keyof typeof ObservabilityEventName];

type ObservabilityEventHandler = (event: ObservabilityEvent) => void;

/**
 * A unified pub/sub event system tying every observability signal this
 * package tracks — tokens, cost, duration, provider, engine, workflow,
 * errors, retries — into one ordered stream. Reuses the existing Timeline
 * for history (composition, not reimplementation) and the existing
 * CostEstimator/ExecutionMetrics for the two convenience `track*From*`
 * helpers below, rather than duplicating their math.
 */
export class ObservabilityBus {
  private readonly handlers = new Set<ObservabilityEventHandler>();

  constructor(private readonly timeline: Timeline = new Timeline()) {}

  /** Subscribe to every event this bus emits. Returns an unsubscribe function. */
  subscribe(handler: ObservabilityEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: ObservabilityEvent): void {
    this.timeline.record(event);
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  /** The full ordered history of every event emitted so far. */
  getTimeline(): ObservabilityEvent[] {
    return this.timeline.list();
  }

  trackTokens(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.TOKENS, metadata });
  }

  trackCost(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.COST, metadata });
  }

  /** Computes cost via the existing estimateCost() rather than duplicating its math. */
  trackCostFromEstimate(input: CostEstimateInput, extra?: Record<string, unknown>): void {
    this.trackCost({ ...estimateCost(input), ...extra });
  }

  trackDuration(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.DURATION, metadata });
  }

  /** Reads duration via the existing ExecutionMetrics rather than duplicating its math. */
  trackDurationFromMetrics(metrics: ExecutionMetrics, extra?: Record<string, unknown>): void {
    this.trackDuration({ durationMs: metrics.getDuration(), ...extra });
  }

  trackProvider(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.PROVIDER, metadata });
  }

  trackEngine(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.ENGINE, metadata });
  }

  trackWorkflow(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.WORKFLOW, metadata });
  }

  trackError(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.ERROR, metadata });
  }

  trackRetry(metadata: Record<string, unknown>): void {
    this.emit({ event: ObservabilityEventName.RETRY, metadata });
  }
}
