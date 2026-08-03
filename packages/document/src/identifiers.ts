/**
 * The Engine ids this Feature Pack will register once execution is
 * implemented. Namespaced `<domain>.<action>`, matching the id shape
 * `@aidex/engines`' EngineRegistry expects. Phase 1 defines these ids only —
 * no Engine implementing them exists yet.
 */
export const DocumentEngineId = {
  Extract: 'document.extract',
  Ocr: 'document.ocr',
  Translate: 'document.translate',
  Summarize: 'document.summarize',
  Classify: 'document.classify',
  Keywords: 'document.keywords',
  Transform: 'document.transform',
  Review: 'document.review',
  ResumeAnalyze: 'resume.analyze',
  InvoiceExtract: 'invoice.extract',
  ContractReview: 'contract.review',
} as const;

export type DocumentEngineId = (typeof DocumentEngineId)[keyof typeof DocumentEngineId];
