import type { AIControlState } from '@aidex/ai-control';
import type { Connection } from '@aidex/connections';

/**
 * Aggregated, derived-only observability numbers — never the raw event
 * timeline itself (that stays behind ObservabilityBus.getTimeline(), one
 * hop away, for callers that genuinely need per-event detail). A pure
 * reduction over ObservabilityBus.getTimeline(); nothing here is tracked
 * separately from that timeline.
 *
 * `lastEventAt` is the one field that isn't a pure per-event reduction:
 * @aidex/observability's ObservabilityEvent carries no timestamp of its own
 * (Timeline never generates one — see its doc comment), so this instead
 * records the wall-clock time AdminController itself last observed an event
 * via ObservabilityBus.subscribe(). It answers "when did Admin last see
 * activity," not "when did the most recent event actually fire."
 */
export interface ObservabilitySummary {
  readonly totalTokens?: number;
  readonly totalCostUsd?: number;
  readonly errorCount: number;
  readonly lastEventAt?: string;
}

/**
 * A simple, derived-only current-state signal — not a monitoring platform.
 * `'ai-disabled'` wins over `'no-enabled-connections'` when both apply,
 * since a globally disabled AI control is the more fundamental blocker.
 */
export type AdminHealthStatus = 'ok' | 'ai-disabled' | 'no-enabled-connections';

/**
 * An immutable, point-in-time, structurally-safe-to-serialize read of
 * everything Admin composes. Every field is derived from an existing
 * package's own state at the moment `AdminController.getSnapshot()` is
 * called — nothing here is stored by Admin as a parallel copy.
 *
 * `connections` is exactly `ConnectionManager.list()`'s existing output —
 * `Connection` structurally has no `config` field, so no secret can reach
 * this snapshot through it. `aiControl` is exactly `AIFeatureControl.
 * getState()`'s output, which has no knowledge of providers/secrets at all.
 * Provider capability information is deliberately NOT included — deferred
 * to a later checkpoint.
 */
export interface AdminSnapshot {
  readonly connections: readonly Connection[];
  readonly aiControl: AIControlState;
  readonly observability: ObservabilitySummary;
  readonly health: AdminHealthStatus;
}
