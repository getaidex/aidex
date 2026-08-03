import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_SOCIAL_POST_PROMPT } from '../prompts/designSocialPostPrompt.js';
import { DesignSocialPostStrategy } from '../strategies/DesignSocialPostStrategy.js';
import type { DesignSocialPostResult } from '../types/DesignSocialPost.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignSocialPostEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignSocialPostEngine implements Engine<DesignSocialPostResult> {
  readonly id = DesignEngineId.SocialPost;
  readonly name = 'Design Social Post';
  readonly description = 'Generates a social media graphic sized for a target platform.';
  readonly version = '1.0.0';

  private readonly strategy: DesignSocialPostStrategy;

  constructor(config: DesignSocialPostEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_SOCIAL_POST_PROMPT);
    this.strategy = new DesignSocialPostStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignSocialPostResult> {
    const input = context.request?.input;
    assertHasNonEmptyStringField(this.id, input, 'brief');

    return this.strategy.execute(
      {
        strategy: this.strategy.name,
        input,
        metadata: context.request?.metadata,
        options: context.request?.options,
      },
      context
    );
  }
}
