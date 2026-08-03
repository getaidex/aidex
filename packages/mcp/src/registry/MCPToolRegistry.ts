import { DuplicateRegistrationError } from '@aidex/core';
import type { MCPTool, MCPToolResult } from '../types/MCPTool.js';
import { MCPToolNotFoundError } from '../errors/MCPToolNotFoundError.js';

/**
 * Central, name-keyed registry for MCP tools — register once, dispatch by
 * name. Mirrors `@aidex/engines`' `EngineRegistry` exactly: this registry
 * never knows what any given tool does, only that it exists and can be
 * called. A future package registering an Aidex-Engine-backed tool never
 * requires a change here.
 */
export class MCPToolRegistry {
  private readonly tools = new Map<string, MCPTool>();

  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new DuplicateRegistrationError('MCPTool', tool.name);
    }
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  list(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async call<TInput = unknown>(name: string, input: TInput): Promise<MCPToolResult> {
    const tool = this.tools.get(name) as MCPTool<TInput> | undefined;
    if (!tool) {
      throw new MCPToolNotFoundError(name);
    }

    return tool.execute(input);
  }
}
