/**
 * One stored item. Generic over its value type; carries no provider,
 * application, or vendor-specific field of any kind.
 */
export interface MemoryEntry<TValue = unknown> {
  readonly key: string;
  readonly value: TValue;
}
