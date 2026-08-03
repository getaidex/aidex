import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { CONTENT_ENGINE_METADATA } from './metadata.js';
import { CONTENT_FEATURE_PACKAGE } from './featurePackage.js';

const require = createRequire(import.meta.url);

describe('CONTENT_FEATURE_PACKAGE', () => {
  it('carries the real package name and version', () => {
    const pkg = require('../package.json');

    expect(CONTENT_FEATURE_PACKAGE.name).toBe(pkg.name);
    expect(CONTENT_FEATURE_PACKAGE.version).toBe(pkg.version);
  });

  it('reuses the exact CONTENT_ENGINE_METADATA array — no duplication', () => {
    expect(CONTENT_FEATURE_PACKAGE.metadata).toBe(CONTENT_ENGINE_METADATA);
  });

  it('lists all 14 real content engines, with no missing or extra ids', () => {
    const ids = (CONTENT_FEATURE_PACKAGE.engines ?? []).map((e) => e.id).sort();

    expect(ids).toEqual(
      [
        'content.generate',
        'content.rewrite',
        'content.expand',
        'content.shorten',
        'content.translate',
        'content.summarize',
        'content.tone',
        'content.seo',
        'content.blog',
        'content.email',
        'content.social',
        'content.product-description',
        'content.headline',
        'content.tagline',
      ].sort()
    );
  });

  it('every engine instance constructs and exposes name/description/version', () => {
    for (const engine of CONTENT_FEATURE_PACKAGE.engines ?? []) {
      expect(engine.name.length).toBeGreaterThan(0);
      expect(engine.description.length).toBeGreaterThan(0);
      expect(engine.version.length).toBeGreaterThan(0);
    }
  });

  it('has matching engine and metadata ids (no drift between engines and metadata)', () => {
    const engineIds = new Set((CONTENT_FEATURE_PACKAGE.engines ?? []).map((e) => e.id));
    const metadataIds = new Set((CONTENT_FEATURE_PACKAGE.metadata ?? []).map((m) => m.id));

    expect(engineIds).toEqual(metadataIds);
  });

  it('lists all 14 real content prompts', () => {
    expect(CONTENT_FEATURE_PACKAGE.prompts ?? []).toHaveLength(14);
  });

  it('exposes all 6 real workflow-wrapper instances as pass-through', () => {
    const workflows = CONTENT_FEATURE_PACKAGE.workflows ?? [];

    expect(workflows).toHaveLength(6);
    expect(workflows.map((w) => w.constructor.name).sort()).toEqual(
      [
        'ContentBlogWorkflow',
        'ContentSocialWorkflow',
        'ContentEmailWorkflow',
        'ContentRepurposeWorkflow',
        'ContentArticleWorkflow',
        'ContentProductLaunchWorkflow',
      ].sort()
    );
  });
});
