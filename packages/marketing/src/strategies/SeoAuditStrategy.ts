import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { SEO_AUDIT_PROMPT_ID } from '../prompts/seoAuditPrompt.js';
import type { MarketingEnginePricing } from '../pricing/MarketingEnginePricing.js';
import type { SeoAuditFinding, SeoAuditResult } from '../types/seo.types.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasNonEmptyStringField } from '../validation/assertHasNonEmptyStringField.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { readString } from '../engines/internal/readField.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asRecordArray, asString } from '../parsing/coerce.js';

const VALID_SEVERITIES: ReadonlySet<string> = new Set(['low', 'medium', 'high']);

export interface SeoAuditStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: MarketingEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseSeoAuditResponse(strategyName: string, response: ProviderResponse): SeoAuditResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  const score = parsed ? asNumber(parsed.score) : undefined;
  if (score === undefined) {
    throw new UnparsableProviderResponseError(
      strategyName,
      response.content,
      'expected an object with a "score" number'
    );
  }

  const findingRecords = parsed ? asRecordArray(parsed.findings) : [];
  const findings: SeoAuditFinding[] = findingRecords.map((entry) => {
    const issue = asString(entry.issue);
    const recommendation = asString(entry.recommendation);
    if (issue === undefined || recommendation === undefined) {
      throw new UnparsableProviderResponseError(
        strategyName,
        response.content,
        'expected every finding to have "issue" and "recommendation" strings'
      );
    }
    const severity = asString(entry.severity);
    return {
      issue,
      recommendation,
      severity: severity !== undefined && VALID_SEVERITIES.has(severity)
        ? (severity as SeoAuditFinding['severity'])
        : 'medium',
    };
  });

  return { score, findings };
}

/**
 * Follows CampaignPlanStrategy's established shape exactly — see that
 * class for the full architecture rationale. No `brief` requirement,
 * unlike most strategies in this package: `seo.audit` inspects an
 * existing page/URL, not a fresh creative brief.
 */
export class SeoAuditStrategy implements Strategy<SeoAuditResult> {
  readonly name = 'marketing-seo-audit';
  readonly version = '1.0.0';

  private readonly pricing?: MarketingEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: SeoAuditStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<SeoAuditResult> {
    const input = request.input;
    assertHasNonEmptyStringField(this.name, input, 'url');

    const url = input.url as string;
    const content = readString(input, 'content');
    const contentNote = content ? ` Page content:\n${content}` : '';

    const promptText = this.prompts.render(SEO_AUDIT_PROMPT_ID, { url, contentNote });
    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseSeoAuditResponse(this.name, response);
  }
}
