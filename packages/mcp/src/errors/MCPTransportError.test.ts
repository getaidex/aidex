import { describe, expect, it } from 'vitest';
import { MCPTransportError } from './MCPTransportError.js';

describe('MCPTransportError', () => {
  it('carries a descriptive message', () => {
    const error = new MCPTransportError('Failed to parse incoming message as JSON: boom');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPTransportError);
    expect(error.name).toBe('MCPTransportError');
    expect(error.message).toBe('Failed to parse incoming message as JSON: boom');
  });
});
