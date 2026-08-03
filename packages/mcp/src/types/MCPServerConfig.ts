import type { ILogger } from '@aidex/core';
import type { MCPTransport } from './MCPTransport.js';

/** `transport` is required, mirroring `@aidex/core`'s `AidexConfig.provider` — a server that can never send/receive isn't meaningfully constructed yet. */
export interface MCPServerConfig {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly transport: MCPTransport;
  readonly logger?: ILogger;
}
