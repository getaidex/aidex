import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DocumentEngineId } from '../identifiers.js';
import { DocumentClassifyEngine } from '../engines/DocumentClassifyEngine.js';
import { DocumentKeywordsEngine } from '../engines/DocumentKeywordsEngine.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentClassifyResult } from '../types/DocumentClassify.js';
import type { DocumentKeywordsResult } from '../types/DocumentKeywords.js';
import type { DocumentSource } from '../types/DocumentSource.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const DOCUMENT_ANALYSIS_WORKFLOW_ID = 'document.workflow.document-analysis';

export interface DocumentAnalysisWorkflowInput {
  readonly source: DocumentSource;
}

export interface DocumentAnalysisPackage {
  readonly classification: DocumentClassifyResult;
  readonly keywords: DocumentKeywordsResult;
}

export interface DocumentAnalysisWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface DocumentAnalysisWorkflowState {
  readonly input: DocumentAnalysisWorkflowInput;
  readonly provider: Provider;
  classification?: DocumentClassifyResult;
  keywords?: DocumentKeywordsResult;
}

class ClassifyStep implements WorkflowStep<DocumentAnalysisWorkflowState> {
  readonly name = DocumentEngineId.Classify;
  private readonly engine: DocumentClassifyEngine;

  constructor(config: DocumentAnalysisWorkflowConfig) {
    this.engine = new DocumentClassifyEngine(config);
  }

  async execute(state: DocumentAnalysisWorkflowState): Promise<void> {
    state.classification = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Classify, { source: state.input.source })
    );
  }
}

class KeywordsStep implements WorkflowStep<DocumentAnalysisWorkflowState> {
  readonly name = DocumentEngineId.Keywords;
  private readonly engine: DocumentKeywordsEngine;

  constructor(config: DocumentAnalysisWorkflowConfig) {
    this.engine = new DocumentKeywordsEngine(config);
  }

  async execute(state: DocumentAnalysisWorkflowState): Promise<void> {
    state.keywords = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Keywords, { source: state.input.source })
    );
  }
}

/**
 * Composes 2 existing @aidex/document engines into one pipeline —
 * document.classify → document.keywords — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers.
 *
 * Unlike `DocumentReviewWorkflow`/`DocumentTransformationWorkflow`/
 * `DocumentLocalizationWorkflow`, these two steps are NOT data-dependent —
 * the same honest constraint `@aidex/marketing`'s `AnalyticsWorkflow`/
 * `@aidex/media`'s `AudioProcessingWorkflow` document for their own
 * independent pairs. `document.classify`'s Result (`documentType`,
 * `confidence?`) is a label, not document content — there is no
 * meaningful `DocumentSource` to adapt it into for `document.keywords` to
 * consume. So both steps read `state.input.source` directly rather than
 * chaining one engine's output into another's input. This workflow's
 * value is bundling classification + keywords into one call with shared
 * lifecycle/cancellation/error handling, not fabricating a pipeline the
 * engines don't actually support.
 */
export class DocumentAnalysisWorkflow {
  readonly id = DOCUMENT_ANALYSIS_WORKFLOW_ID;
  readonly name = 'Document Analysis';
  readonly description = 'Classifies a document and extracts its key phrases, bundled as one analysis package.';

  private readonly workflow = new Workflow<DocumentAnalysisWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: DocumentAnalysisWorkflowConfig = {}) {
    this.workflow.addStep(new ClassifyStep(config));
    this.workflow.addStep(new KeywordsStep(config));
  }

  async run(
    input: DocumentAnalysisWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<DocumentAnalysisPackage> {
    const state: DocumentAnalysisWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      classification: finalState.classification as DocumentClassifyResult,
      keywords: finalState.keywords as DocumentKeywordsResult,
    };
  }
}
