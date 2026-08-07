import type { AidexOptions } from './AidexOptions.js';
import type { Metadata } from './Metadata.js';

export interface AidexRequest<TContext = unknown> {
  strategy: string;
  input?: unknown;
  context?: TContext;
  metadata?: Metadata;
  options?: AidexOptions;
  /**
   * Correlates every layer an execution passes through (context, strategy,
   * engine, provider, observability event, response metadata) back to one
   * caller-visible id. Supply your own to correlate against your own
   * tracing; omit it and the SDK generates one.
   */
  executionId?: string;
}
