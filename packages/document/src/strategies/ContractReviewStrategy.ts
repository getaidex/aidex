import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { CONTRACT_REVIEW_PROMPT_ID } from '../prompts/contractReviewPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { ContractRisk, ContractReviewRequest, ContractReviewResult } from '../types/ContractReview.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface ContractReviewStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set(['low', 'medium', 'high']);

function parseRisk(value: unknown): ContractRisk | undefined {
  const record = asRecord(value);
  const clause = record ? asString(record.clause) : undefined;
  const explanation = record ? asString(record.explanation) : undefined;
  const severity = record ? asString(record.severity) : undefined;

  if (clause === undefined || explanation === undefined || severity === undefined || !VALID_SEVERITIES.has(severity)) {
    return undefined;
  }

  return { clause, explanation, severity: severity as ContractRisk['severity'] };
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseContractReviewResponse(strategyName: string, response: ProviderResponse): ContractReviewResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  if (!parsed) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected a JSON object');
  }

  const risksRaw = Array.isArray(parsed.risks) ? parsed.risks : [];
  const risks = risksRaw.map(parseRisk).filter((risk): risk is ContractRisk => risk !== undefined);
  const summary = asString(parsed.summary);

  return summary !== undefined ? { risks, summary } : { risks };
}

/**
 * Renders the registered `contract.review` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * ContractReviewResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class ContractReviewStrategy implements Strategy<ContractReviewResult> {
  readonly name = 'contract-review';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ContractReviewStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ContractReviewResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, focusAreas } = input as ContractReviewRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only reviews text/* sources`
      );
    }

    const promptText = this.prompts.render(CONTRACT_REVIEW_PROMPT_ID, {
      document: source.content,
      focusAreasNote:
        focusAreas && focusAreas.length > 0
          ? ` Focus specifically on: ${focusAreas.join(', ')}.`
          : '',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseContractReviewResponse(this.name, response);
  }
}
