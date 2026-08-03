// Adapters
export { EngineToMCPToolAdapter } from './adapter/EngineToMCPToolAdapter.js';
export { MCPAidexAdapter } from './adapter/MCPAidexAdapter.js';
export { EngineRegistryToMCPAdapter } from './adapter/EngineRegistryToMCPAdapter.js';
export { executeAdaptedEngine } from './adapter/executeAdaptedEngine.js';

// Config types
export type { EngineToMCPToolAdapterConfig } from './types/EngineToMCPToolAdapterConfig.js';
export type { MCPAidexAdapterConfig } from './types/MCPAidexAdapterConfig.js';
export type { EngineRegistryToMCPAdapterConfig } from './types/EngineRegistryToMCPAdapterConfig.js';

// Errors
export { InvalidEngineError } from './errors/InvalidEngineError.js';

// Note: DuplicateRegistrationError (thrown by MCPAidexAdapter.registerEngine(),
// via mcpServer.tools.register()) is not re-exported — consumers import it
// directly from @aidex/core, the same convention every other registry
// package in this repo follows (@aidex/tools, @aidex/prompts, @aidex/engines,
// @aidex/catalog, @aidex/mcp never re-export it either).
