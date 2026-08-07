import { AidexError } from '@aidex/core';

/**
 * Thrown by AIFeatureControlPlugin.beforeExecute() when AI is disabled
 * (globally, or for the specific feature/strategy being invoked) — mirrors
 * @aidex/connections' DisabledConnectionError shape. Thrown before
 * Aidex.execute() looks up or runs any Strategy, so no Provider is ever
 * called and no provider/secret detail can leak here; this package has no
 * knowledge of either.
 */
export class AIDisabledError extends AidexError {
  readonly feature?: string;

  constructor(feature: string | undefined, executionId?: string) {
    super(feature ? `AI is disabled for feature "${feature}"` : 'AI is disabled', {
      code: 'ai_disabled',
      executionId,
    });
    this.name = 'AIDisabledError';
    this.feature = feature;
    Object.setPrototypeOf(this, AIDisabledError.prototype);
  }
}
