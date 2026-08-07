import type { ExecutionContext, Plugin } from '@aidex/core';
import { AIDisabledError } from './errors/AIDisabledError.js';
import type { AIFeatureControl } from './types/AIFeatureControl.js';

/**
 * Wires an AIFeatureControl into the Aidex kernel's existing Plugin/Lifecycle
 * extension point — no @aidex/core change required. `Aidex.execute()` awaits
 * every registered `beforeExecute` handler sequentially, without catching
 * (packages/core/src/kernel/lifecycle/Lifecycle.ts), and does so before it
 * looks up or runs any Strategy. Throwing here therefore aborts execute()
 * before a Strategy — and so before a Provider — is ever reached.
 *
 * The feature id defaults to `request.strategy`: every AI-invoking Strategy
 * already has a stable name, so that name doubles as the feature-control
 * granularity with no new naming system and no coupling to any specific
 * application's feature list.
 *
 * Register this first in `AidexConfig.plugins` so the check runs before any
 * other plugin's `beforeExecute` does unrelated work — not required for
 * correctness (no Provider call is reachable before this hook regardless of
 * order), just for avoiding wasted work in other plugins.
 */
export class AIFeatureControlPlugin implements Plugin {
  readonly name = 'ai-feature-control';

  constructor(private readonly control: AIFeatureControl) {}

  beforeExecute(context: ExecutionContext): void {
    const feature = context.request?.strategy;
    if (!this.control.isEnabled(feature)) {
      throw new AIDisabledError(feature, context.executionId);
    }
  }
}
