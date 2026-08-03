export { DocumentEngineId } from './identifiers.js';

export { DOCUMENT_ENGINE_METADATA } from './metadata.js';

export { DOCUMENT_FEATURE_PACKAGE } from './featurePackage.js';
export type { DocumentWorkflow } from './featurePackage.js';

// Workflows — reusable multi-engine compositions (Phase 4)
export { DocumentReviewWorkflow, DOCUMENT_REVIEW_WORKFLOW_ID } from './workflows/DocumentReviewWorkflow.js';
export type {
  DocumentReviewWorkflowInput,
  DocumentReviewPackage,
  DocumentReviewWorkflowConfig,
} from './workflows/DocumentReviewWorkflow.js';
export { DocumentAnalysisWorkflow, DOCUMENT_ANALYSIS_WORKFLOW_ID } from './workflows/DocumentAnalysisWorkflow.js';
export type {
  DocumentAnalysisWorkflowInput,
  DocumentAnalysisPackage,
  DocumentAnalysisWorkflowConfig,
} from './workflows/DocumentAnalysisWorkflow.js';
export {
  DocumentTransformationWorkflow,
  DOCUMENT_TRANSFORMATION_WORKFLOW_ID,
} from './workflows/DocumentTransformationWorkflow.js';
export type {
  DocumentTransformationWorkflowInput,
  DocumentTransformationPackage,
  DocumentTransformationWorkflowConfig,
} from './workflows/DocumentTransformationWorkflow.js';
export {
  DocumentLocalizationWorkflow,
  DOCUMENT_LOCALIZATION_WORKFLOW_ID,
} from './workflows/DocumentLocalizationWorkflow.js';
export type {
  DocumentLocalizationWorkflowInput,
  LocalizedDocumentPackage,
  DocumentLocalizationWorkflowConfig,
} from './workflows/DocumentLocalizationWorkflow.js';

export type { DocumentSource } from './types/DocumentSource.js';

export type { DocumentExtractRequest, DocumentExtractResult } from './types/DocumentExtract.js';
export type { DocumentOcrRequest, DocumentOcrResult, OcrPage } from './types/DocumentOcr.js';
export type { DocumentTranslateRequest, DocumentTranslateResult } from './types/DocumentTranslate.js';
export type { DocumentSummarizeRequest, DocumentSummarizeResult } from './types/DocumentSummarize.js';
export type { DocumentClassifyRequest, DocumentClassifyResult } from './types/DocumentClassify.js';
export type { DocumentKeywordsRequest, DocumentKeywordsResult } from './types/DocumentKeywords.js';
export type { DocumentTransformRequest, DocumentTransformResult } from './types/DocumentTransform.js';
export type {
  DocumentReviewRequest,
  DocumentReviewResult,
  DocumentReviewFinding,
} from './types/DocumentReview.js';
export type { ResumeAnalysisRequest, ResumeAnalysisResult } from './types/ResumeAnalysis.js';
export type {
  InvoiceExtractionRequest,
  InvoiceExtractionResult,
  InvoiceLineItem,
} from './types/InvoiceExtraction.js';
export type { ContractReviewRequest, ContractReviewResult, ContractRisk } from './types/ContractReview.js';

// Engines
export { DocumentExtractEngine } from './engines/DocumentExtractEngine.js';
export type { DocumentExtractEngineConfig } from './engines/DocumentExtractEngine.js';
export { DocumentOcrEngine } from './engines/DocumentOcrEngine.js';
export { DocumentTranslateEngine } from './engines/DocumentTranslateEngine.js';
export type { DocumentTranslateEngineConfig } from './engines/DocumentTranslateEngine.js';
export { DocumentSummarizeEngine } from './engines/DocumentSummarizeEngine.js';
export type { DocumentSummarizeEngineConfig } from './engines/DocumentSummarizeEngine.js';
export { DocumentClassifyEngine } from './engines/DocumentClassifyEngine.js';
export type { DocumentClassifyEngineConfig } from './engines/DocumentClassifyEngine.js';
export { DocumentKeywordsEngine } from './engines/DocumentKeywordsEngine.js';
export type { DocumentKeywordsEngineConfig } from './engines/DocumentKeywordsEngine.js';
export { DocumentTransformEngine } from './engines/DocumentTransformEngine.js';
export type { DocumentTransformEngineConfig } from './engines/DocumentTransformEngine.js';
export { DocumentReviewEngine } from './engines/DocumentReviewEngine.js';
export type { DocumentReviewEngineConfig } from './engines/DocumentReviewEngine.js';
export { ResumeAnalysisEngine } from './engines/ResumeAnalysisEngine.js';
export type { ResumeAnalysisEngineConfig } from './engines/ResumeAnalysisEngine.js';
export { InvoiceExtractionEngine } from './engines/InvoiceExtractionEngine.js';
export type { InvoiceExtractionEngineConfig } from './engines/InvoiceExtractionEngine.js';
export { ContractReviewEngine } from './engines/ContractReviewEngine.js';
export type { ContractReviewEngineConfig } from './engines/ContractReviewEngine.js';

// Strategies
export { DocumentSummarizeStrategy, parseDocumentSummarizeResponse } from './strategies/DocumentSummarizeStrategy.js';
export type { DocumentSummarizeStrategyConfig } from './strategies/DocumentSummarizeStrategy.js';
export { DocumentExtractStrategy, parseDocumentExtractResponse } from './strategies/DocumentExtractStrategy.js';
export type { DocumentExtractStrategyConfig } from './strategies/DocumentExtractStrategy.js';
export { DocumentTranslateStrategy, parseDocumentTranslateResponse } from './strategies/DocumentTranslateStrategy.js';
export type { DocumentTranslateStrategyConfig } from './strategies/DocumentTranslateStrategy.js';
export { ResumeAnalysisStrategy, parseResumeAnalysisResponse } from './strategies/ResumeAnalysisStrategy.js';
export type { ResumeAnalysisStrategyConfig } from './strategies/ResumeAnalysisStrategy.js';
export {
  InvoiceExtractionStrategy,
  parseInvoiceExtractionResponse,
} from './strategies/InvoiceExtractionStrategy.js';
export type { InvoiceExtractionStrategyConfig } from './strategies/InvoiceExtractionStrategy.js';
export { ContractReviewStrategy, parseContractReviewResponse } from './strategies/ContractReviewStrategy.js';
export type { ContractReviewStrategyConfig } from './strategies/ContractReviewStrategy.js';
export { DocumentClassifyStrategy, parseDocumentClassifyResponse } from './strategies/DocumentClassifyStrategy.js';
export type { DocumentClassifyStrategyConfig } from './strategies/DocumentClassifyStrategy.js';
export { DocumentKeywordsStrategy, parseDocumentKeywordsResponse } from './strategies/DocumentKeywordsStrategy.js';
export type { DocumentKeywordsStrategyConfig } from './strategies/DocumentKeywordsStrategy.js';
export {
  DocumentTransformStrategy,
  parseDocumentTransformResponse,
} from './strategies/DocumentTransformStrategy.js';
export type { DocumentTransformStrategyConfig } from './strategies/DocumentTransformStrategy.js';
export { DocumentReviewStrategy, parseDocumentReviewResponse } from './strategies/DocumentReviewStrategy.js';
export type { DocumentReviewStrategyConfig } from './strategies/DocumentReviewStrategy.js';

// Prompts
export { DOCUMENT_SUMMARIZE_PROMPT, DOCUMENT_SUMMARIZE_PROMPT_ID } from './prompts/documentSummarizePrompt.js';
export { DOCUMENT_EXTRACT_PROMPT, DOCUMENT_EXTRACT_PROMPT_ID } from './prompts/documentExtractPrompt.js';
export { DOCUMENT_TRANSLATE_PROMPT, DOCUMENT_TRANSLATE_PROMPT_ID } from './prompts/documentTranslatePrompt.js';
export { RESUME_ANALYSIS_PROMPT, RESUME_ANALYSIS_PROMPT_ID } from './prompts/resumeAnalysisPrompt.js';
export { INVOICE_EXTRACTION_PROMPT, INVOICE_EXTRACTION_PROMPT_ID } from './prompts/invoiceExtractionPrompt.js';
export { CONTRACT_REVIEW_PROMPT, CONTRACT_REVIEW_PROMPT_ID } from './prompts/contractReviewPrompt.js';
export { DOCUMENT_CLASSIFY_PROMPT, DOCUMENT_CLASSIFY_PROMPT_ID } from './prompts/documentClassifyPrompt.js';
export { DOCUMENT_KEYWORDS_PROMPT, DOCUMENT_KEYWORDS_PROMPT_ID } from './prompts/documentKeywordsPrompt.js';
export { DOCUMENT_TRANSFORM_PROMPT, DOCUMENT_TRANSFORM_PROMPT_ID } from './prompts/documentTransformPrompt.js';
export { DOCUMENT_REVIEW_PROMPT, DOCUMENT_REVIEW_PROMPT_ID } from './prompts/documentReviewPrompt.js';

export type { DocumentEnginePricing } from './pricing/DocumentEnginePricing.js';

// Note: assertHasValidSource, callProviderWithObservability/
// CallProviderWithObservabilityParams, and the src/parsing/ toolkit
// (parseJsonResponse, coerce.ts) are deliberately NOT exported — they're
// internal plumbing every strategy above shares, not a capability external
// consumers need. Every other feature pack (@aidex/content, @aidex/design,
// @aidex/media, @aidex/marketing) follows this same convention.

// Errors
export { InvalidDocumentEngineInputError } from './errors/InvalidDocumentEngineInputError.js';
export { UnparsableProviderResponseError } from './errors/UnparsableProviderResponseError.js';
export { NotImplementedError } from './errors/NotImplementedError.js';
