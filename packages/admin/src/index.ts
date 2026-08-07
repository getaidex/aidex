export { AdminController } from './AdminController.js';
export type { AdminControllerConfig } from './AdminController.js';
export type { AdminSnapshot, AdminHealthStatus, ObservabilitySummary } from './types/AdminSnapshot.js';
export { AdminConfigurationError } from './errors/AdminConfigurationError.js';

// Re-exported because they're direct parameter/return types of
// AdminController's own public methods — an application calling
// registerConnection()/updateConnection() would otherwise need to import
// @aidex/connections directly just to type its own call sites. Mirrors
// @aidex/sdk's Provider/Plugin re-export for the identical reason.
export type { Connection, RegisterConnectionInput, UpdateConnectionInput } from '@aidex/connections';
export type { AIControlState } from '@aidex/ai-control';
