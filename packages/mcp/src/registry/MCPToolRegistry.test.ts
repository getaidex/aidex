import { DuplicateRegistrationError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import type { MCPTool } from '../types/MCPTool.js';
import { MCPToolNotFoundError } from '../errors/MCPToolNotFoundError.js';
import { MCPToolRegistry } from './MCPToolRegistry.js';

function makeTool(name: string, text = 'ok'): MCPTool {
  return {
    name,
    description: `The ${name} tool`,
    async execute() {
      return { content: [{ type: 'text', text }] };
    },
  };
}

describe('MCPToolRegistry', () => {
  it('registers a tool and makes it discoverable', () => {
    const registry = new MCPToolRegistry();
    const tool = makeTool('search');

    registry.register(tool);

    expect(registry.has('search')).toBe(true);
    expect(registry.get('search')).toBe(tool);
    expect(registry.list()).toEqual([tool]);
  });

  it('starts empty', () => {
    const registry = new MCPToolRegistry();

    expect(registry.has('search')).toBe(false);
    expect(registry.get('search')).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });

  it('throws DuplicateRegistrationError when the same name is registered twice', () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('search'));

    expect(() => registry.register(makeTool('search'))).toThrow(DuplicateRegistrationError);
  });

  it('unregister() removes a tool and reports whether one was removed', () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('search'));

    expect(registry.unregister('search')).toBe(true);
    expect(registry.has('search')).toBe(false);
    expect(registry.unregister('search')).toBe(false);
  });

  it('call() invokes the registered tool and returns its result', async () => {
    const registry = new MCPToolRegistry();
    registry.register(makeTool('search', 'result text'));

    const result = await registry.call('search', { query: 'x' });

    expect(result).toEqual({ content: [{ type: 'text', text: 'result text' }] });
  });

  it('call() passes the input through to the tool unchanged', async () => {
    const registry = new MCPToolRegistry();
    let seenInput: unknown;
    registry.register({
      name: 'echo',
      async execute(input) {
        seenInput = input;
        return { content: [] };
      },
    });

    await registry.call('echo', { a: 1 });

    expect(seenInput).toEqual({ a: 1 });
  });

  it('call() throws MCPToolNotFoundError for an unregistered name', async () => {
    const registry = new MCPToolRegistry();

    await expect(registry.call('missing', {})).rejects.toBeInstanceOf(MCPToolNotFoundError);
  });
});
