import { EngineCatalog } from '@aidex/catalog';
import { describe, expect, it } from 'vitest';
import { MarketingEngineId } from '../identifiers.js';
import { MARKETING_ENGINE_METADATA } from './metadata.js';

const ALL_IDS = Object.values(MarketingEngineId);

describe('MARKETING_ENGINE_METADATA', () => {
  it('has exactly one entry per MarketingEngineId value', () => {
    expect(MARKETING_ENGINE_METADATA.map((m) => m.id).sort()).toEqual([...ALL_IDS].sort());
  });

  it('has 14 entries', () => {
    expect(MARKETING_ENGINE_METADATA).toHaveLength(14);
  });

  it('tags every entry as @aidex/marketing', () => {
    expect(MARKETING_ENGINE_METADATA.every((m) => m.featurePack === '@aidex/marketing')).toBe(true);
  });

  it('marks every entry as version 1.0.0 (all 14 are AI-backed as of Phase 3)', () => {
    expect(MARKETING_ENGINE_METADATA.every((m) => m.version === '1.0.0')).toBe(true);
  });

  it('gives every entry a non-empty name, description, requestType, responseType, and category', () => {
    for (const entry of MARKETING_ENGINE_METADATA) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.requestType.length).toBeGreaterThan(0);
      expect(entry.responseType.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('gives every entry at least one tag', () => {
    expect(MARKETING_ENGINE_METADATA.every((m) => m.tags.length > 0)).toBe(true);
  });

  it('registers cleanly into an EngineCatalog with no duplicate ids', () => {
    const catalog = new EngineCatalog();
    for (const metadata of MARKETING_ENGINE_METADATA) {
      catalog.register(metadata);
    }
    expect(catalog.findByFeaturePack('@aidex/marketing')).toHaveLength(MARKETING_ENGINE_METADATA.length);
  });

  it('reuses every category from the existing catalog — zero new categories invented', () => {
    const existingCategories = new Set([
      'analysis',
      'branding',
      'conversion',
      'extraction',
      'generation',
      'layout',
      'marketing',
      'ocr',
      'planning',
      'presentation',
      'print',
      'summarization',
      'template',
      'transcription',
      'transformation',
      'translation',
    ]);
    for (const entry of MARKETING_ENGINE_METADATA) {
      expect(existingCategories.has(entry.category)).toBe(true);
    }
  });

  it('groups social.caption/social.hashtags under the same "marketing" category design.banner/design.social-post use', () => {
    const captionEntry = MARKETING_ENGINE_METADATA.find((m) => m.id === MarketingEngineId.SocialCaption);
    const hashtagsEntry = MARKETING_ENGINE_METADATA.find((m) => m.id === MarketingEngineId.SocialHashtags);
    expect(captionEntry?.category).toBe('marketing');
    expect(hashtagsEntry?.category).toBe('marketing');
  });

  it('groups analytics.summary under the same "summarization" category document.summarize/content.summarize/media.audio.summarize use', () => {
    const entry = MARKETING_ENGINE_METADATA.find((m) => m.id === MarketingEngineId.AnalyticsSummary);
    expect(entry?.category).toBe('summarization');
  });
});
