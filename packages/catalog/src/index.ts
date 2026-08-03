export { EngineCatalog } from './catalog/EngineCatalog.js';
export { resolveCatalogEngine } from './registry/resolveCatalogEngine.js';
export type { EngineMetadata } from './types/EngineMetadata.js';
export type { EngineLookup, ResolvedCatalogEngine } from './registry/resolveCatalogEngine.js';

// Note: DuplicateRegistrationError (thrown by register()) is not
// re-exported — consumers import it directly from @aidex/core, the same
// convention every other registry package in this repo follows
// (@aidex/tools, @aidex/prompts, @aidex/engines never re-export it either).
