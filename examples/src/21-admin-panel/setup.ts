/**
 * The exact composition boilerplate a real application would write —
 * shared by both index.ts (the runnable CLI narration) and
 * AdminPanel.test.ts, so both exercise identical wiring. Nothing here is
 * specific to React; @aidex/admin-react only enters at the component layer.
 */
import { Aidex } from '@aidex/core';
import { ConnectionManager } from '@aidex/connections';
import { AIFeatureControlPlugin, InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { AdminController } from '@aidex/admin';
import { StubProvider } from '@aidex/providers';
import { TextGenerationStrategy } from '@aidex/strategies';

export const CONNECTION_ID = 'primary';
export const STRATEGY_NAME = 'text-generation';

export interface AdminPanelDemo {
  connectionManager: ConnectionManager;
  aiControl: InMemoryAIFeatureControl;
  observability: ObservabilityBus;
  admin: AdminController;
  aidex: Aidex;
}

/**
 * StubProvider is deterministic and offline — no API key required, same
 * choice 06-observability's manual-instrumentation path makes.
 */
export function buildDemo(): AdminPanelDemo {
  const connectionManager = new ConnectionManager();
  connectionManager.registerProviderFactory('stub', () => new StubProvider());
  connectionManager.register({ id: CONNECTION_ID, providerType: 'stub', config: {} });

  const aiControl = new InMemoryAIFeatureControl();
  const observability = new ObservabilityBus();

  // The same ConnectionManager-resolved Provider that Aidex will actually
  // call, and the same AIFeatureControl instance AdminController reads —
  // never a second, parallel copy of either.
  const provider = connectionManager.resolve(CONNECTION_ID);
  const aidex = new Aidex({ provider, plugins: [new AIFeatureControlPlugin(aiControl)] });
  aidex.registerStrategy(new TextGenerationStrategy());

  const admin = new AdminController({ connectionManager, aiControl, observability });

  return { connectionManager, aiControl, observability, admin, aidex };
}

/**
 * StubProvider makes no real network call, so — like 06-observability's
 * manual-instrumentation path for the same provider — there's nothing for
 * it to auto-report. This mirrors that existing example's established
 * pattern rather than inventing a new one.
 */
export async function runAI(demo: AdminPanelDemo, input: string): Promise<string> {
  try {
    const result = await demo.aidex.execute<string>({ strategy: STRATEGY_NAME, input });
    demo.observability.trackTokens({ totalTokens: result.length });
    return result;
  } catch (error) {
    demo.observability.trackError({ error });
    throw error;
  }
}
