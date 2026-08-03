import type { ILogger } from '@aidex/core';

/**
 * A thin, safe wrapper around ILogger for logging a strategy's start/finish.
 * Never throws — a missing logger, or a logger whose own methods throw, both
 * result in a silent no-op rather than an exception reaching the caller. No
 * persistence, no provider knowledge: this only ever calls the injected
 * ILogger, nothing else.
 */
export class ExecutionLogger {
  constructor(private readonly logger?: ILogger) {}

  logStart(strategyName: string): void {
    this.safeLog(() => this.logger?.info('[execution] start', strategyName));
  }

  logFinish(strategyName: string, durationMs?: number): void {
    this.safeLog(() => this.logger?.info('[execution] finish', strategyName, durationMs));
  }

  private safeLog(fn: () => void): void {
    try {
      fn();
    } catch {
      // ExecutionLogger must never throw, even if the supplied ILogger does.
    }
  }
}
