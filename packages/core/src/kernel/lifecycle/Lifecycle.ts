import type { ExecutionContext } from '../../types/ExecutionContext.js';

export type LifecyclePhase = 'boot' | 'ready' | 'beforeExecute' | 'afterExecute' | 'shutdown';

type LifecycleHandler = (context: ExecutionContext) => void | Promise<void>;

export class Lifecycle {
  private readonly handlers = new Map<LifecyclePhase, LifecycleHandler[]>();

  on(phase: LifecyclePhase, handler: LifecycleHandler): void {
    const existing = this.handlers.get(phase) ?? [];
    existing.push(handler);
    this.handlers.set(phase, existing);
  }

  async emit(phase: LifecyclePhase, context: ExecutionContext): Promise<void> {
    const handlers = this.handlers.get(phase) ?? [];
    for (const handler of handlers) {
      await handler(context);
    }
  }
}
