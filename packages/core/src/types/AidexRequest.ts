import type { AidexOptions } from './AidexOptions.js';
import type { Metadata } from './Metadata.js';

export interface AidexRequest<TContext = unknown> {
  strategy: string;
  input?: unknown;
  context?: TContext;
  metadata?: Metadata;
  options?: AidexOptions;
}
