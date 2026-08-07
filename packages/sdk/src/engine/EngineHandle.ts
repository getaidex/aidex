import { randomUUID } from 'node:crypto';
import type { AidexConfig } from '@aidex/core';
import type { EngineRegistry } from '@aidex/engines';

/**
 * Returned by AI.engine(engineId) — a thin, engine-scoped handle that
 * delegates every execute() call straight to EngineRegistry.execute().
 * Holds no logic of its own: id lookup, capability validation, and error
 * propagation all happen inside EngineRegistry, never duplicated here.
 *
 * Builds its own ExecutionContext (never goes through Aidex.execute()), so
 * it generates its own executionId too — the same "always present, caller
 * never has to invent one" guarantee Aidex.execute() gives the Strategy
 * path. There's no options parameter here for a caller to supply their own
 * id through, so it's always auto-generated for now.
 */
export class EngineHandle<TResult = unknown, TContext = unknown> {
  constructor(
    private readonly registry: EngineRegistry,
    private readonly config: AidexConfig,
    private readonly engineId: string
  ) {}

  execute(input?: unknown): Promise<TResult> {
    return this.registry.execute<TResult, TContext>(this.engineId, {
      config: this.config,
      provider: this.config.provider,
      logger: this.config.logger,
      request: { strategy: this.engineId, input },
      metadata: this.config.metadata,
      executionId: randomUUID(),
    });
  }
}
