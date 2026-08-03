import type { ExecutionContext, Provider } from '@aidex/core';

/**
 * Every WorkflowStep in this package calls exactly one existing Engine
 * with the identical ExecutionContext shape — only `strategy`/`input`
 * differ per step. Extracted once the second workflow (Presentation)
 * needed the same construction BrandKit's four steps already did.
 */
export function buildEngineContext(provider: Provider, strategy: string, input: unknown): ExecutionContext {
  return {
    config: { provider },
    provider,
    request: { strategy, input },
  };
}
