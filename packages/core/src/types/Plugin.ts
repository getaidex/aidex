import type { ExecutionContext } from './ExecutionContext.js';

export interface Plugin {
  readonly name: string;
  onBoot?(context: ExecutionContext): void | Promise<void>;
  onReady?(context: ExecutionContext): void | Promise<void>;
  beforeExecute?(context: ExecutionContext): void | Promise<void>;
  afterExecute?(context: ExecutionContext): void | Promise<void>;
  onShutdown?(context: ExecutionContext): void | Promise<void>;
}
