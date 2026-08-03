import { describe, expect, it } from 'vitest';
import { MCPPromptNotFoundError } from './MCPPromptNotFoundError.js';

describe('MCPPromptNotFoundError', () => {
  it('carries the missing prompt name and a descriptive message', () => {
    const error = new MCPPromptNotFoundError('summarize');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MCPPromptNotFoundError);
    expect(error.name).toBe('MCPPromptNotFoundError');
    expect(error.promptName).toBe('summarize');
    expect(error.message).toBe('MCP prompt not found: "summarize"');
  });
});
