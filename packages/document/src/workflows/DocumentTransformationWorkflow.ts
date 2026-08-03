import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DocumentEngineId } from '../identifiers.js';
import { DocumentSummarizeEngine } from '../engines/DocumentSummarizeEngine.js';
import { DocumentTransformEngine } from '../engines/DocumentTransformEngine.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentSummarizeResult } from '../types/DocumentSummarize.js';
import type { DocumentTransformResult } from '../types/DocumentTransform.js';
import type { DocumentSource } from '../types/DocumentSource.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const DOCUMENT_TRANSFORMATION_WORKFLOW_ID = 'document.workflow.document-transformation';

export interface DocumentTransformationWorkflowInput {
  readonly source: DocumentSource;
  readonly targetFormat: string;
  readonly maxLength?: number;
}

export interface DocumentTransformationPackage {
  readonly transformed: DocumentTransformResult;
  readonly summary: DocumentSummarizeResult;
}

export interface DocumentTransformationWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface DocumentTransformationWorkflowState {
  readonly input: DocumentTransformationWorkflowInput;
  readonly provider: Provider;
  transformed?: DocumentTransformResult;
  summary?: DocumentSummarizeResult;
}

class TransformStep implements WorkflowStep<DocumentTransformationWorkflowState> {
  readonly name = DocumentEngineId.Transform;
  private readonly engine: DocumentTransformEngine;

  constructor(config: DocumentTransformationWorkflowConfig) {
    this.engine = new DocumentTransformEngine(config);
  }

  async execute(state: DocumentTransformationWorkflowState): Promise<void> {
    state.transformed = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Transform, {
        source: state.input.source,
        targetFormat: state.input.targetFormat,
      })
    );
  }
}

/** Summarizes the *transformed* document, adapted through a synthetic DocumentSource — not the original — real engine composition, not an independent call. */
class SummarizeStep implements WorkflowStep<DocumentTransformationWorkflowState> {
  readonly name = DocumentEngineId.Summarize;
  private readonly engine: DocumentSummarizeEngine;

  constructor(config: DocumentTransformationWorkflowConfig) {
    this.engine = new DocumentSummarizeEngine(config);
  }

  async execute(state: DocumentTransformationWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, TransformStep has already
    // completed successfully and state.transformed is guaranteed set.
    const transformed = state.transformed as DocumentTransformResult;
    const transformedSource: DocumentSource = { content: transformed.content, mimeType: transformed.mimeType };

    state.summary = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Summarize, {
        source: transformedSource,
        maxLength: state.input.maxLength,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/document engines into one pipeline —
 * document.transform → document.summarize — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/document` already ships, and neither engine's contract is
 * touched. Steps communicate forward by adapting document.transform's
 * `{content, mimeType}` Result into a `DocumentSource` — the "adapt
 * through DocumentSource" rule this Feature Pack's own Phase 4 scope
 * requires — so document.summarize summarizes the reformatted document,
 * not the original.
 *
 * Scope note: `document.summarize`'s own Strategy only accepts `text/*`
 * sources, so this workflow only produces a meaningful summary when
 * `targetFormat` resolves to a text MIME type (e.g. `markdown`,
 * `plain-text`, `html`) — the same text-only constraint every strategy
 * in this package already has.
 */
export class DocumentTransformationWorkflow {
  readonly id = DOCUMENT_TRANSFORMATION_WORKFLOW_ID;
  readonly name = 'Document Transformation';
  readonly description = 'Reformats a document into a target format, then summarizes the result.';

  private readonly workflow = new Workflow<DocumentTransformationWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: DocumentTransformationWorkflowConfig = {}) {
    this.workflow.addStep(new TransformStep(config));
    this.workflow.addStep(new SummarizeStep(config));
  }

  async run(
    input: DocumentTransformationWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<DocumentTransformationPackage> {
    const state: DocumentTransformationWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      transformed: finalState.transformed as DocumentTransformResult,
      summary: finalState.summary as DocumentSummarizeResult,
    };
  }
}
