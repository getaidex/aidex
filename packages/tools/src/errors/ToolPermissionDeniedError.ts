/**
 * Thrown by ToolRegistry.execute() when the caller's granted permissions
 * don't cover every permission the tool declares as required.
 */
export class ToolPermissionDeniedError extends Error {
  readonly toolId: string;
  readonly missingPermissions: readonly string[];

  constructor(toolId: string, missingPermissions: readonly string[]) {
    super(
      `Tool "${toolId}" requires permission(s) not granted: ${missingPermissions.join(', ')}`
    );
    this.name = 'ToolPermissionDeniedError';
    this.toolId = toolId;
    this.missingPermissions = missingPermissions;
    Object.setPrototypeOf(this, ToolPermissionDeniedError.prototype);
  }
}
