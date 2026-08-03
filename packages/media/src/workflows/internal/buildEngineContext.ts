import type { ExecutionContext, Provider } from '@aidex/core';

/**
 * Every WorkflowStep in this package calls exactly one existing Engine
 * with the identical ExecutionContext shape — only `strategy`/`input`
 * differ per step. Ported from @aidex/design's identically-purposed
 * helper.
 */
export function buildEngineContext(provider: Provider, strategy: string, input: unknown): ExecutionContext {
  return {
    config: { provider },
    provider,
    request: { strategy, input },
  };
}
