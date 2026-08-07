/**
 * Intentionally minimal: no design system, no styling, no charts. Every
 * piece of Admin state comes from useAdmin(controller) — there is no
 * second React state store here. The only local state is ephemeral UI
 * state (the input text box, the last run result/error), exactly as
 * @aidex/admin-react's own docs describe as the acceptable case for it.
 */
import { useState } from 'react';
import { useAdmin } from '@aidex/admin-react';
import type { AdminController } from '@aidex/admin';
import { STRATEGY_NAME } from './setup.js';

export interface AdminPanelProps {
  controller: AdminController;
  onRun: (input: string) => Promise<string>;
}

export function AdminPanel({ controller, onRun }: AdminPanelProps) {
  const snapshot = useAdmin(controller);
  const [input, setInput] = useState('why is the sky blue?');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const featureEnabled = snapshot.aiControl.features[STRATEGY_NAME] ?? true;

  async function handleRun() {
    setResult(null);
    setError(null);
    try {
      const output = await onRun(input);
      setResult(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div>
      <section data-testid="overview">
        <h2>Admin Overview</h2>
        <p data-testid="health">Health: {snapshot.health}</p>
      </section>

      <section data-testid="ai-control">
        <h2>AI Control</h2>
        <label>
          <input
            type="checkbox"
            data-testid="ai-enabled-toggle"
            checked={snapshot.aiControl.enabled}
            onChange={(event) => controller.setAIEnabled(event.target.checked)}
          />
          AI enabled globally
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            data-testid="feature-enabled-toggle"
            checked={featureEnabled}
            onChange={(event) => controller.setFeatureEnabled(STRATEGY_NAME, event.target.checked)}
          />
          {STRATEGY_NAME} feature enabled
        </label>
      </section>

      <section data-testid="connections">
        <h2>Connections</h2>
        <ul>
          {snapshot.connections.map((connection) => (
            <li key={connection.id} data-testid={`connection-${connection.id}`}>
              {connection.id} ({connection.providerType}) —{' '}
              {connection.enabled ? 'enabled' : 'disabled'}
              <button
                type="button"
                data-testid={`connection-toggle-${connection.id}`}
                onClick={() =>
                  connection.enabled
                    ? controller.disableConnection(connection.id)
                    : controller.enableConnection(connection.id)
                }
              >
                Toggle
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section data-testid="observability">
        <h2>Observability Summary</h2>
        <p data-testid="observability-tokens">Total tokens: {snapshot.observability.totalTokens ?? 0}</p>
        <p data-testid="observability-cost">Total cost (USD): {snapshot.observability.totalCostUsd ?? 0}</p>
        <p data-testid="observability-errors">Errors: {snapshot.observability.errorCount}</p>
      </section>

      <section data-testid="run-ai">
        <h2>Run AI</h2>
        <input
          data-testid="run-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="button" data-testid="run-button" onClick={handleRun}>
          Run AI
        </button>
        {result !== null && <p data-testid="run-result">Result: {result}</p>}
        {error !== null && <p data-testid="run-error">Error: {error}</p>}
      </section>
    </div>
  );
}
