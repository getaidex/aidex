import { DuplicateRegistrationError } from '@aidex/core';
import type { Tool } from '../types/Tool.js';
import { ToolNotFoundError } from '../errors/ToolNotFoundError.js';
import { ToolPermissionDeniedError } from '../errors/ToolPermissionDeniedError.js';

/**
 * Central registry for reusable tools. Register once, discover by id or by
 * required permission, execute by id — with permission validation gating
 * every execution.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      throw new DuplicateRegistrationError('Tool', tool.id);
    }
    this.tools.set(tool.id, tool);
  }

  has(id: string): boolean {
    return this.tools.has(id);
  }

  get(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  /** Discovery: every registered tool. */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /** Discovery: tools that require the given permission. */
  listByPermission(permission: string): Tool[] {
    return this.list().filter((tool) => tool.permissions?.includes(permission));
  }

  async execute<TInput = unknown, TResult = unknown>(
    id: string,
    input: TInput,
    grantedPermissions: readonly string[] = []
  ): Promise<TResult> {
    const tool = this.tools.get(id) as Tool<TInput, TResult> | undefined;
    if (!tool) {
      throw new ToolNotFoundError(id);
    }

    const missing = (tool.permissions ?? []).filter(
      (permission) => !grantedPermissions.includes(permission)
    );
    if (missing.length > 0) {
      throw new ToolPermissionDeniedError(id, missing);
    }

    return tool.execute(input);
  }
}
