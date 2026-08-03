import type { ExecutionContext, Plugin } from '@aidex/core';

/**
 * Logs around every lifecycle phase using context.logger, when one is
 * configured. Every hook uses `context.logger?.info(...)` — if AidexConfig
 * carried no logger, every hook safely no-ops instead of throwing.
 *
 * onBoot/onShutdown are implemented for completeness against the Plugin
 * contract, but per doc #4/doc #7 (and ADR-002) neither ever actually fires
 * on a real Aidex instance today: `boot` always emits before any plugin is
 * wired, and no public Aidex method ever emits `shutdown`.
 */
export class LoggerPlugin implements Plugin {
  readonly name = 'logger';

  onBoot(context: ExecutionContext): void {
    context.logger?.info(`[${this.name}] boot`);
  }

  onReady(context: ExecutionContext): void {
    context.logger?.info(`[${this.name}] ready`);
  }

  beforeExecute(context: ExecutionContext): void {
    context.logger?.info(`[${this.name}] beforeExecute`, context.request?.strategy);
  }

  afterExecute(context: ExecutionContext): void {
    context.logger?.info(`[${this.name}] afterExecute`, context.request?.strategy);
  }

  onShutdown(context: ExecutionContext): void {
    context.logger?.info(`[${this.name}] shutdown`);
  }
}
