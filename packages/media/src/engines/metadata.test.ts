import { EngineCatalog } from '@aidex/catalog';
import { describe, expect, it } from 'vitest';
import { MediaEngineId } from '../identifiers.js';
import { MEDIA_ENGINE_METADATA } from './metadata.js';

const ALL_IDS = Object.values(MediaEngineId);

describe('MEDIA_ENGINE_METADATA', () => {
  it('has exactly one entry per MediaEngineId value', () => {
    expect(MEDIA_ENGINE_METADATA.map((m) => m.id).sort()).toEqual([...ALL_IDS].sort());
  });

  it('has 13 entries', () => {
    expect(MEDIA_ENGINE_METADATA).toHaveLength(13);
  });

  it('tags every entry as @aidex/media', () => {
    expect(MEDIA_ENGINE_METADATA.every((m) => m.featurePack === '@aidex/media')).toBe(true);
  });

  it('marks every entry as version 1.0.0 (all 13 are AI-backed as of Phase 3)', () => {
    expect(MEDIA_ENGINE_METADATA.every((m) => m.version === '1.0.0')).toBe(true);
  });

  it('gives every entry a non-empty name, description, requestType, responseType, and category', () => {
    for (const entry of MEDIA_ENGINE_METADATA) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.requestType.length).toBeGreaterThan(0);
      expect(entry.responseType.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('gives every entry at least one tag', () => {
    expect(MEDIA_ENGINE_METADATA.every((m) => m.tags.length > 0)).toBe(true);
  });

  it('registers cleanly into an EngineCatalog with no duplicate ids', () => {
    const catalog = new EngineCatalog();
    for (const metadata of MEDIA_ENGINE_METADATA) {
      catalog.register(metadata);
    }
    expect(catalog.findByFeaturePack('@aidex/media')).toHaveLength(MEDIA_ENGINE_METADATA.length);
  });

  it('groups audio.summarize under the same "summarization" category document.summarize/content.summarize use', () => {
    const entry = MEDIA_ENGINE_METADATA.find((m) => m.id === MediaEngineId.AudioSummarize);
    expect(entry?.category).toBe('summarization');
  });

  it('groups image.generate/video.generate/audio.generate under the same "generation" category content/design use', () => {
    const generationIds = [MediaEngineId.ImageGenerate, MediaEngineId.VideoGenerate, MediaEngineId.AudioGenerate];
    for (const id of generationIds) {
      expect(MEDIA_ENGINE_METADATA.find((m) => m.id === id)?.category).toBe('generation');
    }
  });
});
