import type { AidexRequest, ExecutionContext, Prompt, ProviderResponse, Strategy } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import type { PromptRegistry } from '@aidex/prompts';
import { RESUME_ANALYSIS_PROMPT_ID } from '../prompts/resumeAnalysisPrompt.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { ResumeAnalysisRequest, ResumeAnalysisResult } from '../types/ResumeAnalysis.js';
import { InvalidDocumentEngineInputError } from '../errors/InvalidDocumentEngineInputError.js';
import { UnparsableProviderResponseError } from '../errors/UnparsableProviderResponseError.js';
import { assertHasValidSource } from '../validation/assertHasValidSource.js';
import { callProviderWithObservability } from '../observability/callProviderWithObservability.js';
import { parseJsonResponse } from '../parsing/parseJsonResponse.js';
import { asNumber, asRecord, asString, asStringArray } from '../parsing/coerce.js';

export interface ResumeAnalysisStrategyConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. */
  pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every execute() call records provider/duration/tokens/cost/error events. */
  observability?: ObservabilityBus;
}

/** Its own step so parsing is unit-testable independent of any Provider call. */
export function parseResumeAnalysisResponse(strategyName: string, response: ProviderResponse): ResumeAnalysisResult {
  const parsed = asRecord(parseJsonResponse(strategyName, response.content));
  if (!parsed) {
    throw new UnparsableProviderResponseError(strategyName, response.content, 'expected a JSON object');
  }

  const candidateName = asString(parsed.candidateName);
  const experienceYears = asNumber(parsed.experienceYears);
  const summary = asString(parsed.summary);
  const matchScore = asNumber(parsed.matchScore);

  return {
    skills: asStringArray(parsed.skills),
    ...(candidateName !== undefined ? { candidateName } : {}),
    ...(experienceYears !== undefined ? { experienceYears } : {}),
    ...(summary !== undefined ? { summary } : {}),
    ...(matchScore !== undefined ? { matchScore } : {}),
  };
}

/**
 * Renders the registered `resume.analyze` prompt, calls whichever Provider
 * context.provider holds, and parses the response into
 * ResumeAnalysisResult. Follows DocumentSummarizeStrategy's established
 * shape exactly — see that class for the full architecture rationale.
 *
 * Scope note: text sources only (`mimeType` starting with `text/`) — see
 * @aidex/document's README "Design decisions" for why.
 */
export class ResumeAnalysisStrategy implements Strategy<ResumeAnalysisResult> {
  readonly name = 'resume-analysis';
  readonly version = '1.0.0';

  private readonly pricing?: DocumentEnginePricing;
  private readonly observability?: ObservabilityBus;

  constructor(
    private readonly prompts: PromptRegistry,
    config: ResumeAnalysisStrategyConfig = {}
  ) {
    this.pricing = config.pricing;
    this.observability = config.observability;
  }

  async execute(request: AidexRequest, context: ExecutionContext): Promise<ResumeAnalysisResult> {
    const input = request.input;
    assertHasValidSource(this.name, input);

    const { source, jobDescription } = input as ResumeAnalysisRequest;
    if (!source.mimeType.startsWith('text/')) {
      throw new InvalidDocumentEngineInputError(
        this.name,
        `unsupported mimeType "${source.mimeType}" — this strategy only analyzes text/* sources`
      );
    }

    const promptText = this.prompts.render(RESUME_ANALYSIS_PROMPT_ID, {
      document: source.content,
      jobDescriptionNote:
        jobDescription !== undefined
          ? `Score the candidate's fit against this job description (0-100 in "matchScore"):\n${jobDescription}`
          : 'No job description was provided — set "matchScore" to null.',
    });

    const prompt: Prompt = { content: promptText, metadata: request.metadata };

    const response = await callProviderWithObservability({
      strategyName: this.name,
      providerName: context.provider.name,
      pricing: this.pricing,
      observability: this.observability,
      call: () => context.provider.generate(prompt, request.options),
    });

    return parseResumeAnalysisResponse(this.name, response);
  }
}
