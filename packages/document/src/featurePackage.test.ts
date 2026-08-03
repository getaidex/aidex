import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DOCUMENT_ENGINE_METADATA } from './metadata.js';
import { DOCUMENT_FEATURE_PACKAGE } from './featurePackage.js';

const require = createRequire(import.meta.url);

describe('DOCUMENT_FEATURE_PACKAGE', () => {
  it('carries the real package name and version', () => {
    const pkg = require('../package.json');

    expect(DOCUMENT_FEATURE_PACKAGE.name).toBe(pkg.name);
    expect(DOCUMENT_FEATURE_PACKAGE.version).toBe(pkg.version);
  });

  it('reuses the exact DOCUMENT_ENGINE_METADATA array — no duplication', () => {
    expect(DOCUMENT_FEATURE_PACKAGE.metadata).toBe(DOCUMENT_ENGINE_METADATA);
  });

  it('lists exactly the 11 real document engines, with no missing or extra ids', () => {
    const ids = (DOCUMENT_FEATURE_PACKAGE.engines ?? []).map((e) => e.id).sort();

    expect(ids).toEqual(
      [
        'document.extract',
        'document.ocr',
        'document.translate',
        'document.summarize',
        'document.classify',
        'document.keywords',
        'document.transform',
        'document.review',
        'resume.analyze',
        'invoice.extract',
        'contract.review',
      ].sort()
    );
  });

  it('every engine instance constructs and exposes name/description/version', () => {
    for (const engine of DOCUMENT_FEATURE_PACKAGE.engines ?? []) {
      expect(engine.name.length).toBeGreaterThan(0);
      expect(engine.description.length).toBeGreaterThan(0);
      expect(engine.version.length).toBeGreaterThan(0);
    }
  });

  it('has matching engine and metadata ids (no drift between engines and metadata)', () => {
    const engineIds = new Set((DOCUMENT_FEATURE_PACKAGE.engines ?? []).map((e) => e.id));
    const metadataIds = new Set((DOCUMENT_FEATURE_PACKAGE.metadata ?? []).map((m) => m.id));

    expect(engineIds).toEqual(metadataIds);
  });

  it('lists exactly the 10 real document prompts', () => {
    const ids = (DOCUMENT_FEATURE_PACKAGE.prompts ?? []).map((p) => p.id).sort();

    expect(ids).toHaveLength(10);
  });

  it('exposes the 4 real workflow-wrapper instances as pass-through', () => {
    const workflows = DOCUMENT_FEATURE_PACKAGE.workflows ?? [];

    expect(workflows).toHaveLength(4);
    expect(workflows.map((w) => w.constructor.name).sort()).toEqual(
      [
        'DocumentReviewWorkflow',
        'DocumentAnalysisWorkflow',
        'DocumentTransformationWorkflow',
        'DocumentLocalizationWorkflow',
      ].sort()
    );
  });
});
