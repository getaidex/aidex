import { DuplicateRegistrationError } from '@aidex/core';
import { ProviderCapability } from '@aidex/providers';
import { describe, expect, it } from 'vitest';
import type { EngineMetadata } from '../types/EngineMetadata.js';
import { EngineCatalog } from './EngineCatalog.js';

function makeMetadata(overrides: Partial<EngineMetadata> = {}): EngineMetadata {
  return {
    id: 'test.engine',
    name: 'Test Engine',
    featurePack: '@aidex/test-pack',
    version: '1.0.0',
    description: 'A test engine.',
    requestType: 'TestEngineRequest',
    responseType: 'TestEngineResult',
    tags: ['test'],
    category: 'testing',
    ...overrides,
  };
}

describe('EngineCatalog', () => {
  describe('register() / has() / find()', () => {
    it('makes a registered entry findable by id', () => {
      const catalog = new EngineCatalog();
      const metadata = makeMetadata();

      catalog.register(metadata);

      expect(catalog.has('test.engine')).toBe(true);
      expect(catalog.find('test.engine')).toEqual(metadata);
    });

    it('returns false/undefined for an unregistered id', () => {
      const catalog = new EngineCatalog();

      expect(catalog.has('nope')).toBe(false);
      expect(catalog.find('nope')).toBeUndefined();
    });

    it('throws DuplicateRegistrationError when the same id is registered twice', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'dup' }));

      expect(() => catalog.register(makeMetadata({ id: 'dup', name: 'Different name' }))).toThrow(
        DuplicateRegistrationError
      );
    });
  });

  describe('list()', () => {
    it('returns every registered entry', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a' }));
      catalog.register(makeMetadata({ id: 'b' }));

      expect(catalog.list().map((e) => e.id).sort()).toEqual(['a', 'b']);
    });

    it('returns an empty array when nothing is registered', () => {
      expect(new EngineCatalog().list()).toEqual([]);
    });

    it('returns a snapshot unaffected by later registrations', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a' }));

      const snapshot = catalog.list();
      catalog.register(makeMetadata({ id: 'b' }));

      expect(snapshot).toHaveLength(1);
    });
  });

  describe('findByFeaturePack()', () => {
    it('returns only entries from the given feature pack', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', featurePack: '@aidex/document' }));
      catalog.register(makeMetadata({ id: 'b', featurePack: '@aidex/content' }));
      catalog.register(makeMetadata({ id: 'c', featurePack: '@aidex/document' }));

      expect(catalog.findByFeaturePack('@aidex/document').map((e) => e.id).sort()).toEqual(['a', 'c']);
    });

    it('returns an empty array for an unknown feature pack', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', featurePack: '@aidex/document' }));

      expect(catalog.findByFeaturePack('@aidex/unknown')).toEqual([]);
    });
  });

  describe('findByTag()', () => {
    it('returns entries whose tags include the given tag', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', tags: ['ai', 'text'] }));
      catalog.register(makeMetadata({ id: 'b', tags: ['ai', 'image'] }));
      catalog.register(makeMetadata({ id: 'c', tags: ['image'] }));

      expect(catalog.findByTag('ai').map((e) => e.id).sort()).toEqual(['a', 'b']);
    });

    it('returns an empty array for an unused tag', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', tags: ['ai'] }));

      expect(catalog.findByTag('unused')).toEqual([]);
    });
  });

  describe('findByCategory()', () => {
    it('returns only entries in the given category', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', category: 'generation' }));
      catalog.register(makeMetadata({ id: 'b', category: 'translation' }));

      expect(catalog.findByCategory('generation').map((e) => e.id)).toEqual(['a']);
    });

    it('returns an empty array for an unknown category', () => {
      const catalog = new EngineCatalog();
      catalog.register(makeMetadata({ id: 'a', category: 'generation' }));

      expect(catalog.findByCategory('unknown')).toEqual([]);
    });
  });

  describe('requiredCapabilities metadata field', () => {
    it('round-trips requiredCapabilities through register()/find() when present', () => {
      const catalog = new EngineCatalog();
      const metadata = makeMetadata({
        id: 'video.transcribe',
        requiredCapabilities: [ProviderCapability.Streaming],
      });

      catalog.register(metadata);

      expect(catalog.find('video.transcribe')).toEqual(metadata);
      expect(catalog.find('video.transcribe')?.requiredCapabilities).toEqual([
        ProviderCapability.Streaming,
      ]);
    });

    it('leaves requiredCapabilities undefined when omitted', () => {
      const catalog = new EngineCatalog();
      const metadata = makeMetadata({ id: 'document.extract' });

      catalog.register(metadata);

      expect(catalog.find('document.extract')?.requiredCapabilities).toBeUndefined();
    });

    it('includes requiredCapabilities in list() entries unchanged', () => {
      const catalog = new EngineCatalog();
      catalog.register(
        makeMetadata({ id: 'a', requiredCapabilities: [ProviderCapability.TextGeneration] })
      );
      catalog.register(makeMetadata({ id: 'b' }));

      const [a, b] = catalog.list().sort((x, y) => x.id.localeCompare(y.id));

      expect(a.requiredCapabilities).toEqual([ProviderCapability.TextGeneration]);
      expect(b.requiredCapabilities).toBeUndefined();
    });
  });
});
