import { EngineCatalog } from '@aidex/catalog';
import { describe, expect, it } from 'vitest';
import { ContentBlogEngine } from './engines/ContentBlogEngine.js';
import { ContentEmailEngine } from './engines/ContentEmailEngine.js';
import { ContentExpandEngine } from './engines/ContentExpandEngine.js';
import { ContentGenerateEngine } from './engines/ContentGenerateEngine.js';
import { ContentHeadlineEngine } from './engines/ContentHeadlineEngine.js';
import { ContentProductDescriptionEngine } from './engines/ContentProductDescriptionEngine.js';
import { ContentRewriteEngine } from './engines/ContentRewriteEngine.js';
import { ContentSeoEngine } from './engines/ContentSeoEngine.js';
import { ContentShortenEngine } from './engines/ContentShortenEngine.js';
import { ContentSocialEngine } from './engines/ContentSocialEngine.js';
import { ContentSummarizeEngine } from './engines/ContentSummarizeEngine.js';
import { ContentTaglineEngine } from './engines/ContentTaglineEngine.js';
import { ContentToneEngine } from './engines/ContentToneEngine.js';
import { ContentTranslateEngine } from './engines/ContentTranslateEngine.js';
import { CONTENT_ENGINE_METADATA } from './metadata.js';

const REAL_ENGINES = [
  new ContentGenerateEngine(),
  new ContentRewriteEngine(),
  new ContentExpandEngine(),
  new ContentShortenEngine(),
  new ContentTranslateEngine(),
  new ContentSummarizeEngine(),
  new ContentToneEngine(),
  new ContentSeoEngine(),
  new ContentBlogEngine(),
  new ContentEmailEngine(),
  new ContentSocialEngine(),
  new ContentProductDescriptionEngine(),
  new ContentHeadlineEngine(),
  new ContentTaglineEngine(),
];

describe('CONTENT_ENGINE_METADATA', () => {
  it('has exactly one entry per real engine, matched by id', () => {
    const metadataIds = CONTENT_ENGINE_METADATA.map((m) => m.id).sort();
    const engineIds = REAL_ENGINES.map((e) => e.id).sort();
    expect(metadataIds).toEqual(engineIds);
  });

  it.each(REAL_ENGINES)('matches the real $id engine\'s id/name/description/version', (engine) => {
    const metadata = CONTENT_ENGINE_METADATA.find((m) => m.id === engine.id);
    expect(metadata).toBeDefined();
    expect(metadata?.name).toBe(engine.name);
    expect(metadata?.description).toBe(engine.description);
    expect(metadata?.version).toBe(engine.version);
  });

  it('tags every entry as @aidex/content', () => {
    expect(CONTENT_ENGINE_METADATA.every((m) => m.featurePack === '@aidex/content')).toBe(true);
  });

  it('registers cleanly into an EngineCatalog with no duplicate ids', () => {
    const catalog = new EngineCatalog();
    for (const metadata of CONTENT_ENGINE_METADATA) {
      catalog.register(metadata);
    }
    expect(catalog.findByFeaturePack('@aidex/content')).toHaveLength(CONTENT_ENGINE_METADATA.length);
  });
});
