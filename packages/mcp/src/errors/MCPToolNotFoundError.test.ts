import { describe, expect, it } from 'vitest';
import { MCPToolNotFoundError } from './MCPToolNotFoundError.js';

describe('MCPToolNotFoundError', () => {
  it('carries the missing tool name and a descriptive message', () => {
    const error = new MCPToolNotFoundError('search');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPToolNotFoundError);
    expect(error.name).toBe('MCPToolNotFoundError');
    expect(error.toolName).toBe('search');
    expect(error.message).toBe('MCP tool not found: "search"');
  });
});
