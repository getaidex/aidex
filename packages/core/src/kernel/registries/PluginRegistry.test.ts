import { describe, expect, it } from 'vitest';
import { PluginRegistry } from './PluginRegistry.js';
import type { Plugin } from '../../types/Plugin.js';

function makePlugin(name: string): Plugin {
  return { name };
}

describe('PluginRegistry', () => {
  it('registers and lists plugins', () => {
    const registry = new PluginRegistry();
    const a = makePlugin('logging');
    const b = makePlugin('metrics');

    registry.register(a);
    registry.register(b);

    expect(registry.list()).toEqual([a, b]);
  });

  it('throws DuplicateRegistrationError on a name clash', () => {
    const registry = new PluginRegistry();
    registry.register(makePlugin('logging'));

    expect(() => registry.register(makePlugin('logging'))).toThrow(
      'Plugin already registered: "logging"'
    );
  });
});
