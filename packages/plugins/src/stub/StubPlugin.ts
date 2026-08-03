import type { ExecutionContext, Plugin } from '@aidex/core';

/**
 * The reference Plugin implementation. Implements all five lifecycle hooks
 * with no decision logic of its own — each hook only records that it ran, so
 * tests (and new plugin authors) can see exactly which hooks a given
 * registration/execution sequence actually invokes.
 */
export class StubPlugin implements Plugin {
  readonly name = 'stub';
  readonly calls: string[] = [];

  onBoot(_context: ExecutionContext): void {
    this.calls.push('onBoot');
  }

  onReady(_context: ExecutionContext): void {
    this.calls.push('onReady');
  }

  beforeExecute(_context: ExecutionContext): void {
    this.calls.push('beforeExecute');
  }

  afterExecute(_context: ExecutionContext): void {
    this.calls.push('afterExecute');
  }

  onShutdown(_context: ExecutionContext): void {
    this.calls.push('onShutdown');
  }
}
