import { EngineCatalog } from '@aidex/catalog';
import { describe, expect, it } from 'vitest';
import { ContractReviewEngine } from './engines/ContractReviewEngine.js';
import { DocumentClassifyEngine } from './engines/DocumentClassifyEngine.js';
import { DocumentExtractEngine } from './engines/DocumentExtractEngine.js';
import { DocumentKeywordsEngine } from './engines/DocumentKeywordsEngine.js';
import { DocumentOcrEngine } from './engines/DocumentOcrEngine.js';
import { DocumentReviewEngine } from './engines/DocumentReviewEngine.js';
import { DocumentSummarizeEngine } from './engines/DocumentSummarizeEngine.js';
import { DocumentTransformEngine } from './engines/DocumentTransformEngine.js';
import { DocumentTranslateEngine } from './engines/DocumentTranslateEngine.js';
import { DocumentEngineId } from './identifiers.js';
import { InvoiceExtractionEngine } from './engines/InvoiceExtractionEngine.js';
import { ResumeAnalysisEngine } from './engines/ResumeAnalysisEngine.js';
import { DOCUMENT_ENGINE_METADATA } from './metadata.js';

/**
 * `document.classify`/`document.keywords`/`document.transform`/
 * `document.review` moved into REAL_ENGINES as of the Phase 2 expansion —
 * they were metadata-only `PLANNED_IDS` in Phase 1 (no Engine class
 * existed), but now that `DocumentClassifyEngine` etc. exist, they get
 * the exact same real-instance assertion every other engine in this
 * package already gets.
 */
const REAL_ENGINES = [
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
];

describe('DOCUMENT_ENGINE_METADATA', () => {
  it('has exactly one metadata entry per real engine, matched by id', () => {
    for (const engine of REAL_ENGINES) {
      expect(DOCUMENT_ENGINE_METADATA.filter((m) => m.id === engine.id)).toHaveLength(1);
    }
  });

  it.each(REAL_ENGINES)('matches the real $id engine\'s id/name/description/version', (engine) => {
    const metadata = DOCUMENT_ENGINE_METADATA.find((m) => m.id === engine.id);
    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe(engine.name);
    expect(metadata?.description).toBe(engine.description);
    expect(metadata?.version).toBe(engine.version);
  });

  it('has no metadata entries beyond the real engines', () => {
    const knownIds = new Set(REAL_ENGINES.map((e) => e.id));
    expect(DOCUMENT_ENGINE_METADATA.every((m) => knownIds.has(m.id))).toBe(true);
    expect(DOCUMENT_ENGINE_METADATA).toHaveLength(knownIds.size);
  });

  it('leaves contract.review unchanged — still its own, separate, AI-backed entry', () => {
    const metadata = DOCUMENT_ENGINE_METADATA.find((m) => m.id === DocumentEngineId.ContractReview);
    expect(metadata?.version).toBe('1.0.0');
    expect(metadata?.requestType).toBe('ContractReviewRequest');
    expect(metadata?.responseType).toBe('ContractReviewResult');
  });

  it('gives every entry a non-empty name, description, requestType, responseType, and category', () => {
    for (const entry of DOCUMENT_ENGINE_METADATA) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.requestType.length).toBeGreaterThan(0);
      expect(entry.responseType.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('tags every entry as @aidex/document', () => {
    expect(DOCUMENT_ENGINE_METADATA.every((m) => m.featurePack === '@aidex/document')).toBe(true);
  });

  it('registers cleanly into an EngineCatalog with no duplicate ids', () => {
    const catalog = new EngineCatalog();
    for (const metadata of DOCUMENT_ENGINE_METADATA) {
      catalog.register(metadata);
    }
    expect(catalog.findByFeaturePack('@aidex/document')).toHaveLength(DOCUMENT_ENGINE_METADATA.length);
  });
});
