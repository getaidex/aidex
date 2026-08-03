import { DuplicateRegistrationError } from '@aidex/core';
import { describe, expect, it } from 'vitest';
import type { MCPResource } from '../types/MCPResource.js';
import { MCPResourceNotFoundError } from '../errors/MCPResourceNotFoundError.js';
import { MCPResourceRegistry } from './MCPResourceRegistry.js';

function makeResource(uri: string, text = 'contents'): MCPResource {
  return {
    uri,
    name: uri,
    async read() {
      return { uri, text };
    },
  };
}

describe('MCPResourceRegistry', () => {
  it('registers a resource and makes it discoverable by uri', () => {
    const registry = new MCPResourceRegistry();
    const resource = makeResource('file:///notes.txt');

    registry.register(resource);

    expect(registry.has('file:///notes.txt')).toBe(true);
    expect(registry.get('file:///notes.txt')).toBe(resource);
    expect(registry.list()).toEqual([resource]);
  });

  it('starts empty', () => {
    const registry = new MCPResourceRegistry();

    expect(registry.list()).toEqual([]);
  });

  it('throws DuplicateRegistrationError when the same uri is registered twice', () => {
    const registry = new MCPResourceRegistry();
    registry.register(makeResource('file:///notes.txt'));

    expect(() => registry.register(makeResource('file:///notes.txt'))).toThrow(DuplicateRegistrationError);
  });

  it('unregister() removes a resource and reports whether one was removed', () => {
    const registry = new MCPResourceRegistry();
    registry.register(makeResource('file:///notes.txt'));

    expect(registry.unregister('file:///notes.txt')).toBe(true);
    expect(registry.unregister('file:///notes.txt')).toBe(false);
  });

  it('read() invokes the registered resource and returns its content', async () => {
    const registry = new MCPResourceRegistry();
    registry.register(makeResource('file:///notes.txt', 'hello'));

    const content = await registry.read('file:///notes.txt');

    expect(content).toEqual({ uri: 'file:///notes.txt', text: 'hello' });
  });

  it('read() throws MCPResourceNotFoundError for an unregistered uri', async () => {
    const registry = new MCPResourceRegistry();

    await expect(registry.read('file:///missing.txt')).rejects.toBeInstanceOf(MCPResourceNotFoundError);
  });
});
