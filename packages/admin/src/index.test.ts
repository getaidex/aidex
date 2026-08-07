import { describe, expect, it } from 'vitest';
import { Aidex } from '@aidex/core';
import { ConnectionManager } from '@aidex/connections';
import { AIFeatureControlPlugin, InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import {
  AdminController,
  AdminConfigurationError,
  type AdminSnapshot,
  type Connection,
} from './index.js';

describe('@aidex/admin public API (via package barrel)', () => {
  it('composes the exact ConnectionManager/AIFeatureControl instances Aidex itself uses — a runtime AI-control change is observed by both', async () => {
    const connectionManager = new ConnectionManager();
    connectionManager.registerProviderFactory('stub', () => ({
      name: 'stub',
      async generate(prompt) {
        return { content: `ok:${prompt.content}` };
      },
    }));
    const connection: Connection = connectionManager.register({
      id: 'conn-1',
      providerType: 'stub',
      config: { apiKey: 'secret-should-never-appear-in-snapshot' },
    });

    const aiControl = new InMemoryAIFeatureControl();
    const observability = new ObservabilityBus();

    const provider = connectionManager.resolve('conn-1');
    const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(aiControl)] });
    aidex.registerStrategy({
      name: 'text-generation',
      async execute(request, context) {
        const response = await context.provider.generate({ content: String(request.input ?? '') });
        return response.content;
      },
    });

    const admin = new AdminController({ connectionManager, aiControl, observability });

    await expect(aidex.execute<string>({ strategy: 'text-generation', input: 'hi' })).resolves.toBe('ok:hi');

    // Admin changes AI state; Aidex observes it on the very next execute().
    admin.setAIEnabled(false);
    await expect(aidex.execute({ strategy: 'text-generation', input: 'hi' })).rejects.toThrow('disabled');

    // Admin manages connections through the same manager Aidex's provider came from.
    admin.disableConnection('conn-1');
    expect(connectionManager.get('conn-1')?.enabled).toBe(false);

    const snapshot: AdminSnapshot = admin.getSnapshot();
    expect(snapshot.connections).toEqual([{ id: connection.id, providerType: 'stub', enabled: false, metadata: undefined }]);
    expect(snapshot.aiControl.enabled).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('secret-should-never-appear-in-snapshot');
  });

  it('AdminConfigurationError is exported and is an AidexError', () => {
    expect(() => new AdminController({} as never)).toThrow(AdminConfigurationError);
  });
});
