import type { Metadata } from '../../types/Metadata.js';
import type { ILogger } from '../../types/ILogger.js';
import type { Plugin } from '../../types/Plugin.js';
import type { Provider } from '../../types/Provider.js';

export interface AidexConfig {
  name?: string;
  version?: string;
  provider: Provider;
  logger?: ILogger;
  plugins?: Plugin[];
  metadata?: Metadata;
}
