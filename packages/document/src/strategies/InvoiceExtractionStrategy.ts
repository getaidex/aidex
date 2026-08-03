import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { INVOICE_EXTRACTION_PROMPT_ID } from '../prompts/invoiceExtractionPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { InvoiceExtractionRequest, InvoiceExtractionResult, InvoiceLineItem } from '../types/InvoiceExtraction.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString } from '../parsing/coerce.js';

export interface InvoiceExtractionStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

function parseLineItem(value: unknown): InvoiceLineItem | undefined {
  const record = asRecord(value);
  const description = record ? asString(record.description) : undefined;
  if (description === undefined) {
    return undefined;
  }

  const quantity = asNumber(record?.quantity);
  const unitPrice = asNumber(record?.unitPrice);
  const amount = asNumber(record?.amount);

  return {
    description,
    ...(quantity !== undefined ? { quantity } : {}),
    ...(unitPrice !== undefined ? { unitPrice } : {}),
    ...(amount !== undefined ? { amount } : {}),
  };
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseInvoiceExtractionResponse(
  strategyName: string,
  response: ProviderResponse
): InvoiceExtractionResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  if (!parsed) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected a JSON object');
  }

  const lineItemsRaw = Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
  const lineItems = lineItemsRaw
    .map(parseLineItem)
    .filter((item): item is InvoiceLineItem => item !== undefined);

  const invoiceNumber = asString(parsed.invoiceNumber);
  const issueDate = asString(parsed.issueDate);
  const dueDate = asString(parsed.dueDate);
  const vendorName = asString(parsed.vendorName);
  const totalAmount = asNumber(parsed.totalAmount);
  const currency = asString(parsed.currency);

  return {
    lineItems,
    ...(invoiceNumber !== undefined ? { invoiceNumber } : {}),
    ...(issueDate !== undefined ? { issueDate } : {}),
    ...(dueDate !== undefined ? { dueDate } : {}),
    ...(vendorName !== undefined ? { vendorName } : {}),
    ...(totalAmount !== undefined ? { totalAmount } : {}),
    ...(currency !== undefined ? { currency } : {}),
  };
}

/**
 * Renders the registered `invoice.extract` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * InvoiceExtractionResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class InvoiceExtractionStrategy implements Strategy<InvoiceExtractionResult> {
  readonly name = 'invoice-extraction';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: InvoiceExtractionStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<InvoiceExtractionResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source } = input as InvoiceExtractionRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only extracts from text/* sources`
      );
    }

    const promptText = this.prompts.render(INVOICE_EXTRACTION_PROMPT_ID, {
      document: source.content,
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseInvoiceExtractionResponse(this.name, response);
  }
}
