import type { ExecutionContext } from '@aidex/core';

/**
 * `context` is required and shared across every adapted tool's
 * executions — the same `ExecutionContext` object every call to
 * `Engine.execute()` receives, built once by the caller (never by this
 * package). Mirrors `@aidex/core`'s `AidexConfig.provider` and
 * `@aidex/mcp`'s `MCPServerConfig.transport`: a required field, not
 * optional, because nothing here is meaningfully constructed without it.
 * This package never constructs a `Provider` and never owns its
 * lifecycle — the context, provider included, is entirely the caller's.
 */
export interface EngineToMCPToolAdapterConfig {
  readonly context: ExecutionContext;
}
