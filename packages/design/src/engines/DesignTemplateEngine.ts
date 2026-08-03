import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DesignEngineId } from '../identifiers.js';
import type { DesignEnginePricing } from '../pricing/DesignEnginePricing.js';
import { DESIGN_TEMPLATE_PROMPT } from '../prompts/designTemplatePrompt.js';
import { DesignTemplateStrategy } from '../strategies/DesignTemplateStrategy.js';
import type { DesignTemplateResult } from '../types/DesignTemplate.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';

export interface DesignTemplateEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DesignEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Expansion Phase 3: AI-backed. Follows DesignBrandEngine's established shape exactly — see that class for the full architecture rationale. */
export class DesignTemplateEngine implements Engine<DesignTemplateResult> {
  readonly id = DesignEngineId.Template;
  readonly name = 'Design Template';
  readonly description = 'Generates a reusable design template with marked customizable fields.';
  readonly version = '1.0.0';

  private readonly strategy: DesignTemplateStrategy;

  constructor(config: DesignTemplateEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(DESIGN_TEMPLATE_PROMPT);
    this.strategy = new DesignTemplateStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<DesignTemplateResult> {
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
