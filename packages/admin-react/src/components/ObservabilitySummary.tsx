import type { AdminController } from '@aidex/admin';
import { useAdmin } from '../useAdmin.js';

export interface ObservabilitySummaryProps {
  controller: AdminController;
  className?: string;
}

export function ObservabilitySummary({ controller, className }: ObservabilitySummaryProps) {
  const { observability } = useAdmin(controller);

  return (
    <section className={className} data-testid="observability-summary">
      <h2>Observability Summary</h2>
      {observability.totalTokens !== undefined && (
        <p data-testid="observability-summary-tokens">Total tokens: {observability.totalTokens}</p>
      )}
      {observability.totalCostUsd !== undefined && (
        <p data-testid="observability-summary-cost">Total cost (USD): {observability.totalCostUsd}</p>
      )}
      <p data-testid="observability-summary-errors">Errors: {observability.errorCount}</p>
      {observability.lastEventAt !== undefined && (
        <p data-testid="observability-summary-last-event">Last event: {observability.lastEventAt}</p>
      )}
    </section>
  );
}
