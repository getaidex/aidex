/**
 * Pure execution-duration calculation. Holds two timestamps and nothing
 * else — no logging, no persistence, no knowledge of a provider, strategy,
 * or application. Timestamps are supplied by the caller (defaulting to
 * Date.now() only as a convenience); passing them explicitly keeps this
 * fully deterministic in tests.
 */
export class ExecutionMetrics {
  private startedAt?: number;
  private endedAt?: number;

  recordStart(timestamp: number = Date.now()): void {
    this.startedAt = timestamp;
  }

  recordEnd(timestamp: number = Date.now()): void {
    this.endedAt = timestamp;
  }

  getStartedAt(): number | undefined {
    return this.startedAt;
  }

  getEndedAt(): number | undefined {
    return this.endedAt;
  }

  /** Undefined until both recordStart() and recordEnd() have been called. */
  getDuration(): number | undefined {
    if (this.startedAt === undefined || this.endedAt === undefined) {
      return undefined;
    }
    return this.endedAt - this.startedAt;
  }
}
