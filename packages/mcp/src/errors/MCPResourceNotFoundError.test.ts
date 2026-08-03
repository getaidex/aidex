import { describe, expect, it } from 'vitest';
import { MCPResourceNotFoundError } from './MCPResourceNotFoundError.js';

describe('MCPResourceNotFoundError', () => {
  it('carries the missing uri and a descriptive message', () => {
    const error = new MCPResourceNotFoundError('file:///tmp/notes.txt');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPResourceNotFoundError);
    expect(error.name).toBe('MCPResourceNotFoundError');
    expect(error.uri).toBe('file:///tmp/notes.txt');
    expect(error.message).toBe('MCP resource not found: "file:///tmp/notes.txt"');
  });
});
