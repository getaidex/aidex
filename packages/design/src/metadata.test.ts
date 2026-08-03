import { EngineCatalog } from '@aidex/catalog';
import { describe, expect, it } from 'vitest';
import { DesignBannerEngine } from './engines/DesignBannerEngine.js';
import { DesignBrandEngine } from './engines/DesignBrandEngine.js';
import { DesignBusinessCardEngine } from './engines/DesignBusinessCardEngine.js';
import { DesignFlyerEngine } from './engines/DesignFlyerEngine.js';
import { DesignGenerateEngine } from './engines/DesignGenerateEngine.js';
import { DesignLayoutEngine } from './engines/DesignLayoutEngine.js';
import { DesignLogoEngine } from './engines/DesignLogoEngine.js';
import { DesignMockupEngine } from './engines/DesignMockupEngine.js';
import { DesignPaletteEngine } from './engines/DesignPaletteEngine.js';
import { DesignPosterEngine } from './engines/DesignPosterEngine.js';
import { DesignPresentationEngine } from './engines/DesignPresentationEngine.js';
import { DesignSocialPostEngine } from './engines/DesignSocialPostEngine.js';
import { DesignTemplateEngine } from './engines/DesignTemplateEngine.js';
import { DesignTypographyEngine } from './engines/DesignTypographyEngine.js';
import { DesignEngineId } from './identifiers.js';
import { DESIGN_ENGINE_METADATA } from './metadata.js';

const ALL_IDS = Object.values(DesignEngineId);

// Phase 3 gave the first 7 of the 14 ids a real, AI-backed Engine and
// bumped their metadata version to '1.0.0' to match. Expansion Phase 2
// then gave the other 7 an executable Engine too, but a deterministic
// placeholder — no AI — so metadata stayed at '0.1.0' for those. Expansion
// Phase 3 upgraded that same 7 to AI-backed, following Phase 3's exact
// pattern, and bumped their metadata version to '1.0.0' too: all 14 ids
// are now real. This is the same drift-guard @aidex/document's/
// @aidex/content's own metadata.test.ts runs against their real engines.
const PHASE_3_ENGINES = [
  new DesignBrandEngine(),
  new DesignLogoEngine(),
  new DesignPaletteEngine(),
  new DesignTypographyEngine(),
  new DesignBusinessCardEngine(),
  new DesignMockupEngine(),
  new DesignPresentationEngine(),
];

const EXPANSION_PHASE_3_ENGINES = [
  new DesignGenerateEngine(),
  new DesignLayoutEngine(),
  new DesignPosterEngine(),
  new DesignFlyerEngine(),
  new DesignBannerEngine(),
  new DesignSocialPostEngine(),
  new DesignTemplateEngine(),
];

describe('DESIGN_ENGINE_METADATA', () => {
  it('has exactly one entry per DesignEngineId value', () => {
    expect(DESIGN_ENGINE_METADATA.map((m) => m.id).sort()).toEqual([...ALL_IDS].sort());
  });

  it('tags every entry as @aidex/design', () => {
    expect(DESIGN_ENGINE_METADATA.every((m) => m.featurePack === '@aidex/design')).toBe(true);
  });

  it('marks all 14 ids as version 1.0.0 (all AI-backed, as of Expansion Phase 3)', () => {
    expect(DESIGN_ENGINE_METADATA).toHaveLength(14);
    expect(DESIGN_ENGINE_METADATA.every((m) => m.version === '1.0.0')).toBe(true);
  });

  it('gives every entry a non-empty name, description, requestType, responseType, and category', () => {
    for (const entry of DESIGN_ENGINE_METADATA) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.requestType.length).toBeGreaterThan(0);
      expect(entry.responseType.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('gives every entry at least one tag', () => {
    expect(DESIGN_ENGINE_METADATA.every((m) => m.tags.length > 0)).toBe(true);
  });

  it('registers cleanly into an EngineCatalog with no duplicate ids', () => {
    const catalog = new EngineCatalog();
    for (const metadata of DESIGN_ENGINE_METADATA) {
      catalog.register(metadata);
    }
    expect(catalog.findByFeaturePack('@aidex/design')).toHaveLength(DESIGN_ENGINE_METADATA.length);
  });

  it('groups design.generate under the same "generation" category @aidex/content uses', () => {
    const entry = DESIGN_ENGINE_METADATA.find((m) => m.id === DesignEngineId.Generate);
    expect(entry?.category).toBe('generation');
  });

  it.each(PHASE_3_ENGINES)(
    "matches the real $id engine's name/description/version (Phase 3 drift guard)",
    (engine) => {
      const metadata = DESIGN_ENGINE_METADATA.find((m) => m.id === engine.id);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe(engine.name);
      expect(metadata?.description).toBe(engine.description);
      expect(metadata?.version).toBe(engine.version);
    }
  );

  it.each(EXPANSION_PHASE_3_ENGINES)(
    "matches the real $id engine's name/description/version (Expansion Phase 3 drift guard)",
    (engine) => {
      const metadata = DESIGN_ENGINE_METADATA.find((m) => m.id === engine.id);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe(engine.name);
      expect(metadata?.description).toBe(engine.description);
      expect(metadata?.version).toBe(engine.version);
    }
  );
});
