import type { ExecutionContext } from '@aidex/core';
import type { ProviderCapability } from '@aidex/providers';

/**
 * The contract every engine satisfies. Deliberately provider-agnostic and
 * domain-agnostic — nothing here names a document format, a print target,
 * or any other single application's concern. `context` reuses @aidex/core's
 * ExecutionContext (the same shape a Strategy receives) rather than
 * inventing a parallel one, so an engine can read `context.provider` /
 * `context.logger` / `context.metadata` the same way a Strategy does.
 */
export interface Engine<TResult = unknown, TContext = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  /**
   * ProviderCapability values this engine needs to run correctly. Omitted
   * (as every existing engine does) means no capability check ever runs —
   * identical to today's behavior. Reuses @aidex/providers' capability
   * system as-is; never a parallel/duplicate model.
   */
  readonly requiredCapabilities?: readonly ProviderCapability[];
  execute(context: ExecutionContext<TContext>): Promise<TResult>;
}
