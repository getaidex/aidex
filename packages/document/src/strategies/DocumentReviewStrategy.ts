import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { DOCUMENT_REVIEW_PROMPT_ID } from '../prompts/documentReviewPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentReviewFinding, DocumentReviewRequest, DocumentReviewResult } from '../types/DocumentReview.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asRecord, asString } from '../parsing/coerce.js';

export interface DocumentReviewStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set(['low', 'medium', 'high']);

function parseFinding(value: unknown): DocumentReviewFinding | undefined {
  const record = asRecord(value);
  const issue = record ? asString(record.issue) : undefined;
  const recommendation = record ? asString(record.recommendation) : undefined;
  const severity = record ? asString(record.severity) : undefined;

  if (issue === undefined || recommendation === undefined || severity === undefined || !VALID_SEVERITIES.has(severity)) {
    return undefined;
  }

  return { issue, recommendation, severity: severity as DocumentReviewFinding['severity'] };
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseDocumentReviewResponse(strategyName: string, response: ProviderResponse): DocumentReviewResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  if (!parsed) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected a JSON object');
  }

  const findingsRaw = Array.isArray(parsed.findings) ? parsed.findings : [];
  const findings = findingsRaw.map(parseFinding).filter((finding): finding is DocumentReviewFinding => finding !== undefined);
  const summary = asString(parsed.summary);

  return summary !== undefined ? { findings, summary } : { findings };
}

/**
 * Renders the registered `document.review` prompt, calls whichever
 * Provider context.provider holds, and parses the response into
 * DocumentReviewResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 * Domain-neutral sibling of `ContractReviewStrategy`, which this class
 * mirrors closely.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class DocumentReviewStrategy implements Strategy<DocumentReviewResult> {
  readonly name = 'document-review';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: DocumentReviewStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<DocumentReviewResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, focusAreas } = input as DocumentReviewRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only reviews text/* sources`
      );
    }

    const promptText = this.prompts.render(DOCUMENT_REVIEW_PROMPT_ID, {
      document: source.content,
      focusAreasNote:
        focusAreas && focusAreas.length > 0 ? ` Focus specifically on: ${focusAreas.join(', ')}.` : '',
    });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseDocumentReviewResponse(this.name, response);
  }
}
