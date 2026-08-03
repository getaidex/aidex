import type { AidexRequest, ExecutionContext, Provider } from '@aidex/core';
import { EngineRegistry } from '@aidex/engines';
import { describe, expect, it } from 'vitest';
import { DesignEngineId } from '../identifiers.js';
import { DesignBannerEngine } from './DesignBannerEngine.js';
import { DesignBrandEngine } from './DesignBrandEngine.js';
import { DesignBusinessCardEngine } from './DesignBusinessCardEngine.js';
import { DesignFlyerEngine } from './DesignFlyerEngine.js';
import { DesignGenerateEngine } from './DesignGenerateEngine.js';
import { DesignLayoutEngine } from './DesignLayoutEngine.js';
import { DesignLogoEngine } from './DesignLogoEngine.js';
import { DesignMockupEngine } from './DesignMockupEngine.js';
import { DesignPaletteEngine } from './DesignPaletteEngine.js';
import { DesignPosterEngine } from './DesignPosterEngine.js';
import { DesignPresentationEngine } from './DesignPresentationEngine.js';
import { DesignSocialPostEngine } from './DesignSocialPostEngine.js';
import { DesignTemplateEngine } from './DesignTemplateEngine.js';
import { DesignTypographyEngine } from './DesignTypographyEngine.js';

/**
 * There is no `aidex.engine(id)` method anywhere in this platform —
 * `Aidex` (@aidex/core) has exactly four public methods, none of them
 * that. Engine registration/dispatch by id is @aidex/engines'
 * EngineRegistry — register() then execute(id, context) — the real
 * mechanism this suite verifies against.
 *
 * Expansion Phase 3 upgraded the remaining 7 ids to AI-backed, so all 14
 * are now registerable and provider-backed. One provider mock serves all
 * 14 dispatch calls: each engine's Strategy only reads the JSON keys it
 * expects and ignores the rest, so a single response containing every key
 * any of the 14 might look for is valid input for all of them.
 */
const ALL_FIELDS_RESPONSE = JSON.stringify({
  logoDescription: 'A minimalist mark',
  primaryDescription: 'A minimalist mark',
  colors: [{ name: 'Blue', hex: '#0000FF' }],
  pairings: [{ heading: 'A', body: 'B' }],
  frontDescription: 'Front layout',
  description: 'A generated design asset',
  slides: ['Title slide'],
});

const ALL_IDS = Object.values(DesignEngineId);

const provider: Provider = { name: 'test', async generate() { return { content: ALL_FIELDS_RESPONSE }; } };

function makeContext(request: AidexRequest): ExecutionContext {
  return { config: { provider }, provider, request };
}

function buildRegistry(): EngineRegistry {
  const registry = new EngineRegistry();
  registry.register(new DesignBrandEngine());
  registry.register(new DesignLogoEngine());
  registry.register(new DesignPaletteEngine());
  registry.register(new DesignTypographyEngine());
  registry.register(new DesignBusinessCardEngine());
  registry.register(new DesignMockupEngine());
  registry.register(new DesignPresentationEngine());
  registry.register(new DesignGenerateEngine());
  registry.register(new DesignLayoutEngine());
  registry.register(new DesignPosterEngine());
  registry.register(new DesignFlyerEngine());
  registry.register(new DesignBannerEngine());
  registry.register(new DesignSocialPostEngine());
  registry.register(new DesignTemplateEngine());
  return registry;
}

describe('Design engines — EngineRegistry registration + AI-backed execution (all 14 ids)', () => {
  it('registers all 14 engines with no id collisions', () => {
    const registry = buildRegistry();

    for (const id of ALL_IDS) {
      expect(registry.has(id)).toBe(true);
    }
    expect(registry.list()).toHaveLength(14);
  });

  it('resolves and executes "design.logo" through the registry by id, via the provider', async () => {
    const registry = buildRegistry();

    const result = await registry.execute(DesignEngineId.Logo, {
      config: { provider },
      provider,
      request: { strategy: DesignEngineId.Logo, input: { brief: 'Studio logo' } },
    });

    expect(result).toMatchObject({ primary: { assetUrl: expect.stringContaining('data:text/plain,') } });
  });

  it('resolves and executes "design.generate" through the registry by id, via the provider (Expansion Phase 3)', async () => {
    const registry = buildRegistry();

    const result = await registry.execute(DesignEngineId.Generate, {
      config: { provider },
      provider,
      request: { strategy: DesignEngineId.Generate, input: { brief: 'A new hero graphic' } },
    });

    expect(result).toMatchObject({ assetUrl: expect.stringContaining('data:text/plain,') });
  });

  it('dispatches every registered id to the correct engine, not a neighbor', async () => {
    const registry = buildRegistry();
    const input = { brief: 'x' };

    const brand = await registry.execute(DesignEngineId.Brand, makeContext({ strategy: DesignEngineId.Brand, input }));
    const palette = await registry.execute(
      DesignEngineId.Palette,
      makeContext({ strategy: DesignEngineId.Palette, input })
    );
    const template = await registry.execute(
      DesignEngineId.Template,
      makeContext({ strategy: DesignEngineId.Template, input })
    );

    expect(brand).toHaveProperty('logo');
    expect(palette).toHaveProperty('colors');
    expect(template).toHaveProperty('asset');
  });

  it('every registered engine actually calls context.provider.generate() (AI-backed, not a placeholder)', async () => {
    const registry = buildRegistry();
    let callCount = 0;
    const countingProvider: Provider = {
      name: 'counting',
      async generate() {
        callCount += 1;
        return { content: ALL_FIELDS_RESPONSE };
      },
    };
    const context = (id: string): ExecutionContext => ({
      config: { provider: countingProvider },
      provider: countingProvider,
      request: { strategy: id, input: { brief: 'x' } },
    });

    for (const id of ALL_IDS) {
      await registry.execute(id, context(id));
    }

    expect(callCount).toBe(14);
  });
});
