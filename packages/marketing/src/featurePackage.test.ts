import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { MARKETING_ENGINE_METADATA } from './engines/metadata.js';
import { MARKETING_FEATURE_PACKAGE } from './featurePackage.js';

const require = createRequire(import.meta.url);

describe('MARKETING_FEATURE_PACKAGE', () => {
  it('carries the real package name and version', () => {
    const pkg = require('../package.json');

    expect(MARKETING_FEATURE_PACKAGE.name).toBe(pkg.name);
    expect(MARKETING_FEATURE_PACKAGE.version).toBe(pkg.version);
  });

  it('reuses the exact MARKETING_ENGINE_METADATA array — no duplication', () => {
    expect(MARKETING_FEATURE_PACKAGE.metadata).toBe(MARKETING_ENGINE_METADATA);
  });

  it('lists all 14 real marketing engines, with no missing or extra ids', () => {
    const ids = (MARKETING_FEATURE_PACKAGE.engines ?? []).map((e) => e.id).sort();

    expect(ids).toEqual(
      [
        'marketing.campaign.plan',
        'marketing.campaign.brief',
        'marketing.campaign.calendar',
        'marketing.seo.keywords',
        'marketing.seo.meta',
        'marketing.seo.audit',
        'marketing.social.caption',
        'marketing.social.hashtags',
        'marketing.social.schedule',
        'marketing.email.subject',
        'marketing.email.copy',
        'marketing.email.sequence',
        'marketing.analytics.summary',
        'marketing.analytics.insights',
      ].sort()
    );
  });

  it('every engine instance constructs and exposes name/description/version', () => {
    for (const engine of MARKETING_FEATURE_PACKAGE.engines ?? []) {
      expect(engine.name.length).toBeGreaterThan(0);
      expect(engine.description.length).toBeGreaterThan(0);
      expect(engine.version.length).toBeGreaterThan(0);
    }
  });

  it('has matching engine and metadata ids (no drift between engines and metadata)', () => {
    const engineIds = new Set((MARKETING_FEATURE_PACKAGE.engines ?? []).map((e) => e.id));
    const metadataIds = new Set((MARKETING_FEATURE_PACKAGE.metadata ?? []).map((m) => m.id));

    expect(engineIds).toEqual(metadataIds);
  });

  it('lists all 14 real marketing prompts', () => {
    expect(MARKETING_FEATURE_PACKAGE.prompts ?? []).toHaveLength(14);
  });

  it('exposes all 5 real workflow-wrapper instances as pass-through', () => {
    const workflows = MARKETING_FEATURE_PACKAGE.workflows ?? [];

    expect(workflows).toHaveLength(5);
    expect(workflows.map((w) => w.constructor.name).sort()).toEqual(
      ['CampaignWorkflow', 'SocialWorkflow', 'EmailWorkflow', 'SeoWorkflow', 'AnalyticsWorkflow'].sort()
    );
  });
});
