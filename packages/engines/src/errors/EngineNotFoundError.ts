/**
 * Thrown by EngineRegistry.execute() when no engine is registered under the
 * given id. Mirrors @aidex/core's StrategyNotFoundError shape (a fail-loud,
 * descriptive error rather than a silent undefined) — kept as its own class
 * here since StrategyNotFoundError's message is hardcoded to "Strategy".
 */
export class EngineNotFoundError extends Error {
  readonly engineId: string;

  constructor(engineId: string) {
    super(`Engine not found: "${engineId}"`);
    this.name = 'EngineNotFoundError';
    this.engineId = engineId;
    Object.setPrototypeOf(this, EngineNotFoundError.prototype);
  }
}
