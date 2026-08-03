import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DESIGN_ENGINE_METADATA } from './metadata.js';
import { DESIGN_FEATURE_PACKAGE } from './featurePackage.js';

const require = createRequire(import.meta.url);

describe('DESIGN_FEATURE_PACKAGE', () => {
  it('carries the real package name and version', () => {
    const pkg = require('../package.json');

    expect(DESIGN_FEATURE_PACKAGE.name).toBe(pkg.name);
    expect(DESIGN_FEATURE_PACKAGE.version).toBe(pkg.version);
  });

  it('reuses the exact DESIGN_ENGINE_METADATA array — no duplication', () => {
    expect(DESIGN_FEATURE_PACKAGE.metadata).toBe(DESIGN_ENGINE_METADATA);
  });

  it('lists all 14 real design engines, with no missing or extra ids', () => {
    const ids = (DESIGN_FEATURE_PACKAGE.engines ?? []).map((e) => e.id).sort();

    expect(ids).toEqual(
      [
        'design.generate',
        'design.layout',
        'design.brand',
        'design.palette',
        'design.typography',
        'design.poster',
        'design.flyer',
        'design.business-card',
        'design.banner',
        'design.logo',
        'design.social-post',
        'design.presentation',
        'design.mockup',
        'design.template',
      ].sort()
    );
  });

  it('every engine instance constructs and exposes name/description/version', () => {
    for (const engine of DESIGN_FEATURE_PACKAGE.engines ?? []) {
      expect(engine.name.length).toBeGreaterThan(0);
      expect(engine.description.length).toBeGreaterThan(0);
      expect(engine.version.length).toBeGreaterThan(0);
    }
  });

  it('has matching engine and metadata ids (no drift between engines and metadata)', () => {
    const engineIds = new Set((DESIGN_FEATURE_PACKAGE.engines ?? []).map((e) => e.id));
    const metadataIds = new Set((DESIGN_FEATURE_PACKAGE.metadata ?? []).map((m) => m.id));

    expect(engineIds).toEqual(metadataIds);
  });

  it('lists all 14 real design prompts', () => {
    expect(DESIGN_FEATURE_PACKAGE.prompts ?? []).toHaveLength(14);
  });

  it('exposes both real workflow-wrapper instances as pass-through', () => {
    const workflows = DESIGN_FEATURE_PACKAGE.workflows ?? [];

    expect(workflows).toHaveLength(2);
    expect(workflows.map((w) => w.constructor.name).sort()).toEqual(
      ['BrandKitWorkflow', 'PresentationWorkflow'].sort()
    );
  });
});
