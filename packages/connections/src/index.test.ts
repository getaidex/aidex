import { describe, expect, it } from 'vitest';
import {
  ConnectionManager,
  ConnectionNotFoundError,
  DisabledConnectionError,
  InvalidConnectionConfigError,
  ProviderFactoryNotFoundError,
  type Connection,
  type ProviderFactory,
  type RegisterConnectionInput,
  type ResolveOptions,
  type UpdateConnectionInput,
} from './index.js';

describe('@aidex/connections public API (via package barrel)', () => {
  it('supports the full register/get/list/has/update/enable/disable/resolve/remove flow through the barrel import', () => {
    const manager = new ConnectionManager();
    const input: RegisterConnectionInput = {
      id: 'conn-1',
      providerType: 'stub',
      config: { apiKey: 'test-key' },
    };

    const registered = manager.register(input);
    const factory: ProviderFactory = (config) => ({
      name: 'stub',
      async generate(prompt) {
        return { content: `${String(config.apiKey)}:${prompt.content}` };
      },
    });
    manager.registerProviderFactory('stub', factory);

    expect(manager.get('conn-1')).toEqual(registered);
    expect(manager.list()).toEqual([registered]);
    expect(manager.has('conn-1')).toBe(true);

    const disabled = manager.disable('conn-1');
    expect(disabled.enabled).toBe(false);

    const resolveOptions: ResolveOptions = { executionId: 'exec-1' };
    expect(() => manager.resolve('conn-1', resolveOptions)).toThrow(DisabledConnectionError);

    const enabled = manager.enable('conn-1');
    expect(enabled.enabled).toBe(true);

    const provider = manager.resolve('conn-1');
    expect(provider.name).toBe('stub');

    const updateInput: UpdateConnectionInput = { metadata: { tenant: 'acme' } };
    const updated = manager.update('conn-1', updateInput);
    expect(updated.metadata).toEqual({ tenant: 'acme' });

    expect(manager.remove('conn-1')).toBe(true);
  });

  it('rejects with ConnectionNotFoundError for an unregistered id via the barrel import', () => {
    const manager = new ConnectionManager();
    expect(() => manager.resolve('missing')).toThrow(ConnectionNotFoundError);
  });

  it('get() returns undefined for a missing connection via the barrel import', () => {
    const manager = new ConnectionManager();
    const connection: Connection | undefined = manager.get('missing');
    expect(connection).toBeUndefined();
  });

  it('rejects with InvalidConnectionConfigError for a structurally invalid connection via the barrel import', () => {
    const manager = new ConnectionManager();
    expect(() =>
      manager.register({ id: '', providerType: 'stub', config: {} })
    ).toThrow(InvalidConnectionConfigError);
  });

  it('rejects with ProviderFactoryNotFoundError when resolving with no factory registered via the barrel import', () => {
    const manager = new ConnectionManager();
    manager.register({ id: 'conn-2', providerType: 'unregistered', config: {} });
    expect(() => manager.resolve('conn-2')).toThrow(ProviderFactoryNotFoundError);
  });
});
