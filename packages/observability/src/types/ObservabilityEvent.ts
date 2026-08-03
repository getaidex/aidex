/**
 * Generic execution information only — no provider, vendor, or application
 * fields. `event` is a caller-chosen label (e.g. "started",
 * "provider-called"); `metadata` is a free-form bag for whatever the caller
 * wants to attach, same shape discipline as @aidex/core's own Metadata.
 */
export interface ObservabilityEvent {
  readonly event: string;
  readonly metadata?: Record<string, unknown>;
}
