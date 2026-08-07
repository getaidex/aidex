/**
 * Composes @aidex/admin-react's four reusable components — no inline
 * reimplementation of Admin state/UI here. The only local state is
 * ephemeral, app-specific Run AI state (input text, last result/error);
 * that section stays inline since it's specific to this example's strategy
 * and input shape, not a generic Admin concern.
 */
import { useState } from 'react';
import { AdminOverview, AIControl, ConnectionList, ObservabilitySummary } from '@aidex/admin-react';
import type { AdminController } from '@aidex/admin';
import { STRATEGY_NAME } from './setup.js';

export interface AdminPanelProps {
  controller: AdminController;
  onRun: (input: string) => Promise<string>;
}

export function AdminPanel({ controller, onRun }: AdminPanelProps) {
  const [input, setInput] = useState('why is the sky blue?');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      <AdminOverview controller={controller} />
      <AIControl controller={controller} features={[STRATEGY_NAME]} />
      <ConnectionList controller={controller} />
      <ObservabilitySummary controller={controller} />

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
