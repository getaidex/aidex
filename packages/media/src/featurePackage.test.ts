import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { MEDIA_ENGINE_METADATA } from './engines/metadata.js';
import { MEDIA_FEATURE_PACKAGE } from './featurePackage.js';

const require = createRequire(import.meta.url);

describe('MEDIA_FEATURE_PACKAGE', () => {
  it('carries the real package name and version', () => {
    const pkg = require('../package.json');

    expect(MEDIA_FEATURE_PACKAGE.name).toBe(pkg.name);
    expect(MEDIA_FEATURE_PACKAGE.version).toBe(pkg.version);
  });

  it('reuses the exact MEDIA_ENGINE_METADATA array — no duplication', () => {
    expect(MEDIA_FEATURE_PACKAGE.metadata).toBe(MEDIA_ENGINE_METADATA);
  });

  it('lists all 13 real media engines, with no missing or extra ids', () => {
    const ids = (MEDIA_FEATURE_PACKAGE.engines ?? []).map((e) => e.id).sort();

    expect(ids).toEqual(
      [
        'media.image.generate',
        'media.image.edit',
        'media.image.variant',
        'media.image.optimize',
        'media.video.generate',
        'media.video.edit',
        'media.video.storyboard',
        'media.video.thumbnail',
        'media.audio.generate',
        'media.audio.transcribe',
        'media.audio.summarize',
        'media.asset.convert',
        'media.asset.transform',
      ].sort()
    );
  });

  it('every engine instance constructs and exposes name/description/version', () => {
    for (const engine of MEDIA_FEATURE_PACKAGE.engines ?? []) {
      expect(engine.name.length).toBeGreaterThan(0);
      expect(engine.description.length).toBeGreaterThan(0);
      expect(engine.version.length).toBeGreaterThan(0);
    }
  });

  it('has matching engine and metadata ids (no drift between engines and metadata)', () => {
    const engineIds = new Set((MEDIA_FEATURE_PACKAGE.engines ?? []).map((e) => e.id));
    const metadataIds = new Set((MEDIA_FEATURE_PACKAGE.metadata ?? []).map((m) => m.id));

    expect(engineIds).toEqual(metadataIds);
  });

  it('lists all 13 real media prompts', () => {
    expect(MEDIA_FEATURE_PACKAGE.prompts ?? []).toHaveLength(13);
  });

  it('exposes all 3 real workflow-wrapper instances as pass-through', () => {
    const workflows = MEDIA_FEATURE_PACKAGE.workflows ?? [];

    expect(workflows).toHaveLength(3);
    expect(workflows.map((w) => w.constructor.name).sort()).toEqual(
      ['ImageEnhancementWorkflow', 'VideoPreparationWorkflow', 'AudioProcessingWorkflow'].sort()
    );
  });
});
