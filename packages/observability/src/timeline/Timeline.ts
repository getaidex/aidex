import type { ObservabilityEvent } from '../types/ObservabilityEvent.js';

/**
 * Ordered collector of caller-supplied execution events (e.g. "started",
 * "provider-called", "provider-returned", "strategy-finished"). Preserves
 * insertion order only — it never generates a timestamp, logs, or persists
 * anything; the caller decides what an event is and when it happened.
 */
export class Timeline {
  private readonly events: ObservabilityEvent[] = [];

  record(event: ObservabilityEvent): void {
    this.events.push(event);
  }

  list(): ObservabilityEvent[] {
    return [...this.events];
  }
}
