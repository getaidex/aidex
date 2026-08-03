import type { FeaturePackage } from '@aidex/sdk';
import { DOCUMENT_ENGINE_METADATA } from './metadata.js';
import { DocumentExtractEngine } from './engines/DocumentExtractEngine.js';
import { DocumentOcrEngine } from './engines/DocumentOcrEngine.js';
import { DocumentTranslateEngine } from './engines/DocumentTranslateEngine.js';
import { DocumentSummarizeEngine } from './engines/DocumentSummarizeEngine.js';
import { DocumentClassifyEngine } from './engines/DocumentClassifyEngine.js';
import { DocumentKeywordsEngine } from './engines/DocumentKeywordsEngine.js';
import { DocumentTransformEngine } from './engines/DocumentTransformEngine.js';
import { DocumentReviewEngine } from './engines/DocumentReviewEngine.js';
import { ResumeAnalysisEngine } from './engines/ResumeAnalysisEngine.js';
import { InvoiceExtractionEngine } from './engines/InvoiceExtractionEngine.js';
import { ContractReviewEngine } from './engines/ContractReviewEngine.js';
import { DOCUMENT_SUMMARIZE_PROMPT } from './prompts/documentSummarizePrompt.js';
import { DOCUMENT_EXTRACT_PROMPT } from './prompts/documentExtractPrompt.js';
import { DOCUMENT_TRANSLATE_PROMPT } from './prompts/documentTranslatePrompt.js';
import { RESUME_ANALYSIS_PROMPT } from './prompts/resumeAnalysisPrompt.js';
import { INVOICE_EXTRACTION_PROMPT } from './prompts/invoiceExtractionPrompt.js';
import { CONTRACT_REVIEW_PROMPT } from './prompts/contractReviewPrompt.js';
import { DOCUMENT_CLASSIFY_PROMPT } from './prompts/documentClassifyPrompt.js';
import { DOCUMENT_KEYWORDS_PROMPT } from './prompts/documentKeywordsPrompt.js';
import { DOCUMENT_TRANSFORM_PROMPT } from './prompts/documentTransformPrompt.js';
import { DOCUMENT_REVIEW_PROMPT } from './prompts/documentReviewPrompt.js';
import { DocumentReviewWorkflow } from './workflows/DocumentReviewWorkflow.js';
import { DocumentAnalysisWorkflow } from './workflows/DocumentAnalysisWorkflow.js';
import { DocumentTransformationWorkflow } from './workflows/DocumentTransformationWorkflow.js';
import { DocumentLocalizationWorkflow } from './workflows/DocumentLocalizationWorkflow.js';

export type DocumentWorkflow =
  | DocumentReviewWorkflow
  | DocumentAnalysisWorkflow
  | DocumentTransformationWorkflow
  | DocumentLocalizationWorkflow;

/**
 * @aidex/document's complete manifest — every engine is a singleton,
 * constructed once here and shared across every EngineRegistry that
 * registers it via AIBuilder.use(DOCUMENT_FEATURE_PACKAGE). Engines must
 * stay stateless: all execution state belongs on ExecutionContext, never
 * on the engine instance. `workflows` is pass-through only — never
 * registered anywhere by AIBuilder.use(); call each workflow's own
 * `.run(input, provider, options)` directly.
 */
export const DOCUMENT_FEATURE_PACKAGE: FeaturePackage<DocumentWorkflow> = {
  name: '@aidex/document',
  version: '0.1.0-alpha',
  engines: [
    new DocumentExtractEngine(),
    new DocumentOcrEngine(),
    new DocumentTranslateEngine(),
    new DocumentSummarizeEngine(),
    new DocumentClassifyEngine(),
    new DocumentKeywordsEngine(),
    new DocumentTransformEngine(),
    new DocumentReviewEngine(),
    new ResumeAnalysisEngine(),
    new InvoiceExtractionEngine(),
    new ContractReviewEngine(),
  ],
  prompts: [
    DOCUMENT_SUMMARIZE_PROMPT,
    DOCUMENT_EXTRACT_PROMPT,
    DOCUMENT_TRANSLATE_PROMPT,
    RESUME_ANALYSIS_PROMPT,
    INVOICE_EXTRACTION_PROMPT,
    CONTRACT_REVIEW_PROMPT,
    DOCUMENT_CLASSIFY_PROMPT,
    DOCUMENT_KEYWORDS_PROMPT,
    DOCUMENT_TRANSFORM_PROMPT,
    DOCUMENT_REVIEW_PROMPT,
  ],
  metadata: DOCUMENT_ENGINE_METADATA,
  workflows: [
    new DocumentReviewWorkflow(),
    new DocumentAnalysisWorkflow(),
    new DocumentTransformationWorkflow(),
    new DocumentLocalizationWorkflow(),
  ],
};
