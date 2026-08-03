import type { EngineMetadata } from '@aidex/catalog';
import { DocumentEngineId } from './identifiers.js';

/**
 * Hand-written, not derived from the real Engine classes — types are
 * erased at runtime, so nothing can read DocumentSummarizeEngine's actual
 * `.id`/`.name`/`.description`/`.version` and generate this automatically.
 * `metadata.test.ts` asserts every entry here against the real engine's
 * own fields, since keeping this in sync is this file's job, not
 * @aidex/catalog's.
 *
 * `document.classify`/`document.keywords`/`document.transform`/
 * `document.review` are new as of this expansion. As of the Expansion
 * Phase 3 upgrade, all four are AI-backed like the rest of this file's
 * entries — `version: '1.0.0'` and an `'ai'` tag, bumped from Expansion
 * Phase 1/2's `'0.1.0'`. `classification` is a genuinely new category —
 * no other Feature Pack's catalog entry needed it before;
 * `extraction`/`transformation`/`analysis` are reused from this pack's
 * own existing entries.
 */
export const DOCUMENT_ENGINE_METADATA: readonly EngineMetadata[] = [
  {
    id: DocumentEngineId.Extract,
    name: 'Document Extract',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Extracts structured field data from a document using the configured AI provider.',
    requestType: 'DocumentExtractRequest',
    responseType: 'DocumentExtractResult',
    tags: ['document', 'extraction', 'ai'],
    category: 'extraction',
  },
  {
    id: DocumentEngineId.Ocr,
    name: 'Document OCR',
    featurePack: '@aidex/document',
    version: '0.1.0',
    description: 'Extracts raw text from a scanned or image-based document.',
    requestType: 'DocumentOcrRequest',
    responseType: 'DocumentOcrResult',
    tags: ['document', 'ocr'],
    category: 'ocr',
  },
  {
    id: DocumentEngineId.Translate,
    name: 'Document Translate',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Translates a document into a target language using the configured AI provider.',
    requestType: 'DocumentTranslateRequest',
    responseType: 'DocumentTranslateResult',
    tags: ['document', 'translation', 'ai'],
    category: 'translation',
  },
  {
    id: DocumentEngineId.Summarize,
    name: 'Document Summarize',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Produces a condensed summary of a document using the configured AI provider.',
    requestType: 'DocumentSummarizeRequest',
    responseType: 'DocumentSummarizeResult',
    tags: ['document', 'summarization', 'ai'],
    category: 'summarization',
  },
  {
    id: DocumentEngineId.Classify,
    name: 'Document Classify',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Determines the type or category of a document.',
    requestType: 'DocumentClassifyRequest',
    responseType: 'DocumentClassifyResult',
    tags: ['document', 'classification', 'ai'],
    category: 'classification',
  },
  {
    id: DocumentEngineId.Keywords,
    name: 'Document Keywords',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Extracts key phrases and topics from a document.',
    requestType: 'DocumentKeywordsRequest',
    responseType: 'DocumentKeywordsResult',
    tags: ['document', 'keywords', 'extraction', 'ai'],
    category: 'extraction',
  },
  {
    id: DocumentEngineId.Transform,
    name: 'Document Transform',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: "Reformats or restructures a document's content into a target format.",
    requestType: 'DocumentTransformRequest',
    responseType: 'DocumentTransformResult',
    tags: ['document', 'transformation', 'ai'],
    category: 'transformation',
  },
  {
    id: DocumentEngineId.Review,
    name: 'Document Review',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Reviews a document for issues, optionally scoped to specific focus areas.',
    requestType: 'DocumentReviewRequest',
    responseType: 'DocumentReviewResult',
    tags: ['document', 'review', 'ai'],
    category: 'analysis',
  },
  {
    id: DocumentEngineId.ResumeAnalyze,
    name: 'Resume Analysis',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description:
      'Extracts candidate skills and experience, optionally scored against a job description, using the configured AI provider.',
    requestType: 'ResumeAnalysisRequest',
    responseType: 'ResumeAnalysisResult',
    tags: ['document', 'resume', 'analysis', 'ai'],
    category: 'analysis',
  },
  {
    id: DocumentEngineId.InvoiceExtract,
    name: 'Invoice Extraction',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description: 'Extracts structured invoice fields and line items from a document using the configured AI provider.',
    requestType: 'InvoiceExtractionRequest',
    responseType: 'InvoiceExtractionResult',
    tags: ['document', 'invoice', 'extraction', 'ai'],
    category: 'extraction',
  },
  {
    id: DocumentEngineId.ContractReview,
    name: 'Contract Review',
    featurePack: '@aidex/document',
    version: '1.0.0',
    description:
      'Flags risky clauses in a contract, optionally scoped to specific focus areas, using the configured AI provider.',
    requestType: 'ContractReviewRequest',
    responseType: 'ContractReviewResult',
    tags: ['document', 'contract', 'review', 'ai'],
    category: 'analysis',
  },
];
