import { describe, expect, it } from 'vitest';
import { EngineRegistry, type Engine } from '@aidex/engines';
import { EngineCatalog } from '../catalog/EngineCatalog.js';
import type { EngineMetadata } from '../types/EngineMetadata.js';
import { resolveCatalogEngine, type EngineLookup } from './resolveCatalogEngine.js';

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

function makeEngine(id: string): Engine {
  return {
    id,
    name: id,
    description: `Test engine "${id}"`,
    version: '1.0.0',
    async execute() {
      return null;
    },
  };
}

describe('resolveCatalogEngine', () => {
  it('resolves both metadata and engine when both are registered under the same id', () => {
    const catalog = new EngineCatalog();
    const registry = new EngineRegistry();
    const metadata = makeMetadata({ id: 'document.extract' });
    catalog.register(metadata);
    const engine = makeEngine('document.extract');
    registry.register(engine);

    const resolved = resolveCatalogEngine(catalog, registry, 'document.extract');

    expect(resolved).toEqual({ metadata, engine });
  });

  it('returns undefined when the metadata is missing', () => {
    const catalog = new EngineCatalog();
    const registry = new EngineRegistry();
    registry.register(makeEngine('document.extract'));

    expect(resolveCatalogEngine(catalog, registry, 'document.extract')).toBeUndefined();
  });

  it('returns undefined when the engine is missing from the registry', () => {
    const catalog = new EngineCatalog();
    const registry = new EngineRegistry();
    catalog.register(makeMetadata({ id: 'document.extract' }));

    expect(resolveCatalogEngine(catalog, registry, 'document.extract')).toBeUndefined();
  });

  it('returns undefined when both are missing', () => {
    const catalog = new EngineCatalog();
    const registry = new EngineRegistry();

    expect(resolveCatalogEngine(catalog, registry, 'missing')).toBeUndefined();
  });

  it('never throws, even for a completely unknown id', () => {
    const catalog = new EngineCatalog();
    const registry = new EngineRegistry();

    expect(() => resolveCatalogEngine(catalog, registry, 'unknown')).not.toThrow();
  });

  it('works against a minimal hand-written EngineLookup, proving the structural contract needs no @aidex/engines import', () => {
    const catalog = new EngineCatalog();
    const metadata = makeMetadata({ id: 'custom.engine' });
    catalog.register(metadata);
    const customEngine = { id: 'custom.engine', ranAt: 12345 };
    const lookup: EngineLookup<typeof customEngine> = {
      get: (id) => (id === 'custom.engine' ? customEngine : undefined),
    };

    const resolved = resolveCatalogEngine(catalog, lookup, 'custom.engine');

    expect(resolved).toEqual({ metadata, engine: customEngine });
  });
});
