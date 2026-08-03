import type { EngineCatalog } from '../catalog/EngineCatalog.js';
import type { EngineMetadata } from '../types/EngineMetadata.js';

/**
 * Minimal structural contract for "something that can look up a
 * registered engine instance by id." Deliberately NOT @aidex/engines'
 * EngineRegistry type — @aidex/catalog has zero dependency on
 * @aidex/engines, not even type-only. Any EngineRegistry instance already
 * satisfies this shape structurally (it has a matching get(id) method);
 * callers pass their real registry directly, and TEngine is inferred as
 * their real Engine type without this package ever importing it.
 */
export interface EngineLookup<TEngine = unknown> {
  get(id: string): TEngine | undefined;
}

/** A catalog entry paired with its real, registered engine instance. */
export interface ResolvedCatalogEngine<TEngine = unknown> {
  readonly metadata: EngineMetadata;
  readonly engine: TEngine;
}

/**
 * Pairs a catalog entry with its real, registered engine — without
 * creating, executing, or otherwise touching anything. Returns undefined
 * unless both the metadata and the looked-up engine exist under id.
 */
export function resolveCatalogEngine<TEngine = unknown>(
  catalog: EngineCatalog,
  registry: EngineLookup<TEngine>,
  id: string
): ResolvedCatalogEngine<TEngine> | undefined {
  const metadata = catalog.find(id);
  const engine = registry.get(id);
  return metadata && engine ? { metadata, engine } : undefined;
}
