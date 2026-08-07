import type { AidexConfig } from '../kernel/configuration/AidexConfig.js';
import type { AidexRequest } from './AidexRequest.js';
import type { ILogger } from './ILogger.js';
import type { Metadata } from './Metadata.js';
import type { Provider } from './Provider.js';

export interface ExecutionContext<TContext = unknown> {
  config: AidexConfig;
  provider: Provider;
  logger?: ILogger;
  request?: AidexRequest<TContext>;
  metadata?: Metadata;
  /** Set whenever this context was built for a specific request/execution. */
  executionId?: string;
}
