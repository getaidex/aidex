import type { ExecutionContext } from '@aidex/core';
import type { Engine } from '@aidex/engines';
import type { ObservabilityBus } from '@aidex/observability';
import { PromptRegistry } from '@aidex/prompts';
import { DocumentEngineId } from '../identifiers.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import { INVOICE_EXTRACTION_PROMPT } from '../prompts/invoiceExtractionPrompt.js';
import { InvoiceExtractionStrategy } from '../strategies/InvoiceExtractionStrategy.js';
import type { InvoiceExtractionResult } from '../types/InvoiceExtraction.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';

export interface InvoiceExtractionEngineConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/**
 * Follows DocumentSummarizeEngine's established shape exactly: owns a
 * private PromptRegistry with this engine's one prompt, validates input,
 * then delegates to its Strategy via the same two-argument contract
 * @aidex/core's Aidex.execute() uses — see DocumentSummarizeEngine for the
 * full architecture rationale.
 */
export class InvoiceExtractionEngine implements Engine<InvoiceExtractionResult> {
  readonly id = DocumentEngineId.InvoiceExtract;
  readonly name = 'Invoice Extraction';
  readonly description =
    'Extracts structured invoice fields and line items from a document using the configured AI provider.';
  readonly version = '1.0.0';

  private readonly strategy: InvoiceExtractionStrategy;

  constructor(config: InvoiceExtractionEngineConfig = {}) {
    const prompts = new PromptRegistry();
    prompts.register(INVOICE_EXTRACTION_PROMPT);
    this.strategy = new InvoiceExtractionStrategy(prompts, config);
  }

  async execute(context: ExecutionContext): Promise<InvoiceExtractionResult> {
    const input = context.request?.input;
    assertHasValidSource(this.id, input);

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
