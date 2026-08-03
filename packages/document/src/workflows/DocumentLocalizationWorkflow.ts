import type { Provider } from '@aidex/core';
import type { ObservabilityBus } from '@aidex/observability';
import { Workflow, WorkflowExecutor } from '@aidex/workflow';
import type { WorkflowExecutionOptions, WorkflowStep } from '@aidex/workflow';
import { DocumentEngineId } from '../identifiers.js';
import { DocumentSummarizeEngine } from '../engines/DocumentSummarizeEngine.js';
import { DocumentTranslateEngine } from '../engines/DocumentTranslateEngine.js';
import type { DocumentEnginePricing } from '../pricing/DocumentEnginePricing.js';
import type { DocumentSummarizeResult } from '../types/DocumentSummarize.js';
import type { DocumentTranslateResult } from '../types/DocumentTranslate.js';
import type { DocumentSource } from '../types/DocumentSource.js';
import { buildEngineContext } from './internal/buildEngineContext.js';

export const DOCUMENT_LOCALIZATION_WORKFLOW_ID = 'document.workflow.document-localization';

export interface DocumentLocalizationWorkflowInput {
  readonly source: DocumentSource;
  readonly targetLanguage: string;
  readonly sourceLanguage?: string;
  readonly maxLength?: number;
}

export interface LocalizedDocumentPackage {
  readonly translation: DocumentTranslateResult;
  readonly summary: DocumentSummarizeResult;
}

export interface DocumentLocalizationWorkflowConfig {
  /** Never hardcoded — supply the configured Provider's current rates if cost tracking is wanted. Applied uniformly to every composed engine. */
  readonly pricing?: DocumentEnginePricing;
  /** Optional; when supplied, every composed engine's execute() call records provider/duration/tokens/cost/error events. */
  readonly observability?: ObservabilityBus;
}

interface DocumentLocalizationWorkflowState {
  readonly input: DocumentLocalizationWorkflowInput;
  readonly provider: Provider;
  translation?: DocumentTranslateResult;
  summary?: DocumentSummarizeResult;
}

class TranslateStep implements WorkflowStep<DocumentLocalizationWorkflowState> {
  readonly name = DocumentEngineId.Translate;
  private readonly engine: DocumentTranslateEngine;

  constructor(config: DocumentLocalizationWorkflowConfig) {
    this.engine = new DocumentTranslateEngine(config);
  }

  async execute(state: DocumentLocalizationWorkflowState): Promise<void> {
    state.translation = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Translate, {
        source: state.input.source,
        targetLanguage: state.input.targetLanguage,
        sourceLanguage: state.input.sourceLanguage,
      })
    );
  }
}

/** Summarizes the *translated* text, adapted through a synthetic DocumentSource — not the original document — real engine composition, not an independent call. */
class SummarizeStep implements WorkflowStep<DocumentLocalizationWorkflowState> {
  readonly name = DocumentEngineId.Summarize;
  private readonly engine: DocumentSummarizeEngine;

  constructor(config: DocumentLocalizationWorkflowConfig) {
    this.engine = new DocumentSummarizeEngine(config);
  }

  async execute(state: DocumentLocalizationWorkflowState): Promise<void> {
    // WorkflowExecutor runs steps sequentially and stops on the first
    // failure, so by the time this step runs, TranslateStep has already
    // completed successfully and state.translation is guaranteed set.
    const translation = state.translation as DocumentTranslateResult;
    const translatedSource: DocumentSource = { content: translation.translatedText, mimeType: 'text/plain' };

    state.summary = await this.engine.execute(
      buildEngineContext(state.provider, DocumentEngineId.Summarize, {
        source: translatedSource,
        maxLength: state.input.maxLength,
      })
    );
  }
}

/**
 * Composes 2 existing @aidex/document engines into one pipeline —
 * document.translate → document.summarize — using @aidex/workflow's real
 * Workflow/WorkflowStep/WorkflowExecutor contract. Zero new engines, zero
 * new prompts, zero new providers: every step calls exactly the Engine
 * `@aidex/document` already ships, and neither engine's contract is
 * touched. Steps communicate forward by adapting document.translate's
 * `translatedText` (a plain string) into a `text/plain` `DocumentSource`
 * — the "adapt through DocumentSource" rule this Feature Pack's own
 * Phase 4 scope requires — so document.summarize summarizes the
 * translation, not the original-language document.
 */
export class DocumentLocalizationWorkflow {
  readonly id = DOCUMENT_LOCALIZATION_WORKFLOW_ID;
  readonly name = 'Document Localization';
  readonly description = 'Translates a document into a target language, then summarizes the translation.';

  private readonly workflow = new Workflow<DocumentLocalizationWorkflowState>();
  private readonly executor = new WorkflowExecutor();

  constructor(config: DocumentLocalizationWorkflowConfig = {}) {
    this.workflow.addStep(new TranslateStep(config));
    this.workflow.addStep(new SummarizeStep(config));
  }

  async run(
    input: DocumentLocalizationWorkflowInput,
    provider: Provider,
    options?: WorkflowExecutionOptions
  ): Promise<LocalizedDocumentPackage> {
    const state: DocumentLocalizationWorkflowState = { input, provider };
    const finalState = await this.executor.execute(this.workflow, state, options);

    return {
      translation: finalState.translation as DocumentTranslateResult,
      summary: finalState.summary as DocumentSummarizeResult,
    };
  }
}
