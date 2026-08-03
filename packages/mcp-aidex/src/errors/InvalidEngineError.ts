/**
 * Thrown by `EngineToMCPToolAdapter.adapt()` when the given `Engine`
 * can't become a valid `MCPTool` — in practice, only when `.id` isn't a
 * non-empty string, since that's the one field this package turns into
 * `MCPTool.name` (and, via `MCPAidexAdapter`, a registry key). Every real
 * `Engine` across this platform already satisfies this; this is a
 * boundary check against whatever `Engine` a caller supplies, not
 * feature-pack-specific validation.
 */
export class InvalidEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidEngineError';
    Object.setPrototypeOf(this, InvalidEngineError.prototype);
  }
}
