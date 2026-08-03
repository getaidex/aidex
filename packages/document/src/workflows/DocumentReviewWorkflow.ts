import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DocumentEngineId } from '../identifiers.js';
import { DocumentExtractEngine } from '../engines/DocumentExtractEngine.js';
import { DocumentReviewEngine } from '../engines/DocumentReviewEngine.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentExtractResult } from '../types/DocumentExtract.js';
import type { DocumentReviewResult } from '../types/DocumentReview.js';
import type { DocumentSource } from '../types/DocumentSource.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const DOCUMENT_REVIEW_WORKFLOW_ID = 'document.workflow.document-review';

export interface DocumentReviewWorkflowInput {
  readonly source: DocumentSource;
  readonly fields?: readonly string[];
  readonly focusAreas?: readonly string[];
}

export interface DocumentReviewPackage {
  readonly extracted: DocumentExtractResult;
  readonly review: DocumentReviewResult;
}

export interface DocumentReviewWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface DocumentReviewWorkflowState {
  readonly input: DocumentReviewWorkflowInput;
  readonly provider: Provider;
  extracted?: DocumentExtractResult;
  review?: DocumentReviewResult;
}

/** Renders extracted `fields` as `"key: value"` lines — the DocumentSource adaptation ExtractStep's Result needs to become ReviewStep's input. */
function fieldsToDocumentSource(fields: Record<string, string>): DocumentSource {
  const content = Object.entries(fields)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  return { content, mimeType: 'text/plain' };
}

class ExtractStep implements WorkflowStep<DocumentReviewWorkflowState> {
  readonly name = DocumentEngineId.Extract;
  private readonly engine: DocumentExtractEngine;

  constructor(config: DocumentReviewWorkflowConfig) {
    this.engine = new DocumentExtractEngine(config);
  }

  async execute(state: DocumentReviewWorkflowState): Promise<void> {
    state.extracted = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Extract, {
        source: state.input.source,
        fields: state.input.fields,
      })
    );
  }
}

/** Reviews the *extracted* fields, adapted through a synthetic DocumentSource — not the original document — real engine composition, not an independent call. */
class ReviewStep implements WorkflowStep<DocumentReviewWorkflowState> {
  readonly name = DocumentEngineId.Review;
  private readonly engine: DocumentReviewEngine;

  constructor(config: DocumentReviewWorkflowConfig) {
    this.engine = new DocumentReviewEngine(config);
  }

  async execute(state: DocumentReviewWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, ExtractStep has already
    // completed successfully and state.extracted is guaranteed set.
    const extracted = state.extracted as DocumentExtractResult;

    state.review = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Review, {
        source: fieldsToDocumentSource(extracted.fields),
        focusAreas: state.input.focusAreas,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/document engines into one pipeline —
 * document.extract → document.review — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/document` already ships, and neither engine's contract is
 * touched. Steps communicate forward by adapting document.extract's
 * structured `fields` into a synthetic `DocumentSource` (the only shape
 * document.review's contract accepts) — the "adapt through DocumentSource"
 * rule this Feature Pack's own Phase 4 scope requires — so document.review
 * reviews what was actually extracted, not the raw original document.
 */
export class DocumentReviewWorkflow {
  readonly id = DOCUMENT_REVIEW_WORKFLOW_ID;
  readonly name = 'Document Review';
  readonly description = 'Extracts structured fields from a document, then reviews them for issues.';

  private readonly workflow = new Workflow<DocumentReviewWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: DocumentReviewWorkflowConfig = {}) {
    this.workflow.addStep(new ExtractStep(config));
    this.workflow.addStep(new ReviewStep(config));
  }

  async run(
    input: DocumentReviewWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<DocumentReviewPackage> {
    const state: DocumentReviewWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      extracted: finalState.extracted as DocumentExtractResult,
      review: finalState.review as DocumentReviewResult,
    };
  }
}
