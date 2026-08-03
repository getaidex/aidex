import { DuplicateRegistrationError } from '@aidex/core';
import type { MCPResource, MCPResourceContent } from '../types/MCPResource.js';
import { MCPResourceNotFoundError } from '../errors/MCPResourceNotFoundError.js';

/** Central, uri-keyed registry for MCP resources — register once, dispatch by uri. Mirrors `MCPToolRegistry`'s shape exactly. */
export class MCPResourceRegistry {
  private readonly resources = new Map<string, MCPResource>();

  register(resource: MCPResource): void {
    if (this.resources.has(resource.uri)) {
      throw new DuplicateRegistrationError('MCPResource', resource.uri);
    }
    this.resources.set(resource.uri, resource);
  }

  unregister(uri: string): boolean {
    return this.resources.delete(uri);
  }

  has(uri: string): boolean {
    return this.resources.has(uri);
  }

  get(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  list(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  async read(uri: string): Promise<MCPResourceContent> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new MCPResourceNotFoundError(uri);
    }

    return resource.read();
  }
}
