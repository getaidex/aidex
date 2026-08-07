// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import React from 'react';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { ObservabilitySummary } from './ObservabilitySummary.js';

afterEach(cleanup);

function makeController(observability = new ObservabilityBus()) {
  const controller = new AdminController({
    connectionManager: new ConnectionManager(),
    aiControl: new InMemoryAIFeatureControl(),
    observability,
  });
  return { controller, observability };
}

describe('ObservabilitySummary', () => {
  it('renders initial values (no tokens/cost, zero errors, no last-event)', () => {
    const { controller } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    expect(screen.queryByTestId('observability-summary-tokens')).not.toBeInTheDocument();
    expect(screen.queryByTestId('observability-summary-cost')).not.toBeInTheDocument();
    expect(screen.getByTestId('observability-summary-errors')).toHaveTextContent('Errors: 0');
    expect(screen.queryByTestId('observability-summary-last-event')).not.toBeInTheDocument();
  });

  it('renders total tokens once available', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackTokens({ totalTokens: 42 });
    });

    expect(screen.getByTestId('observability-summary-tokens')).toHaveTextContent('Total tokens: 42');
  });

  it('renders total cost once available', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackCost({ totalCost: 1.5 });
    });

    expect(screen.getByTestId('observability-summary-cost')).toHaveTextContent('Total cost (USD): 1.5');
  });

  it('renders error count', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackError({ error: new Error('boom') });
    });

    expect(screen.getByTestId('observability-summary-errors')).toHaveTextContent('Errors: 1');
  });

  it('renders last event timestamp once an event has arrived', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackTokens({ totalTokens: 1 });
    });

    expect(screen.getByTestId('observability-summary-last-event')).toBeInTheDocument();
  });

  it('updates when the underlying observability bus emits events', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackTokens({ totalTokens: 10 });
      observability.trackTokens({ totalTokens: 5 });
    });

    expect(screen.getByTestId('observability-summary-tokens')).toHaveTextContent('Total tokens: 15');
  });

  it('renders only what AdminSnapshot.observability already derived — no direct ObservabilityBus access in the component', () => {
    const { controller, observability } = makeController();
    render(React.createElement(ObservabilitySummary, { controller }));

    act(() => {
      observability.trackTokens({ totalTokens: 7 });
    });

    expect(screen.getByTestId('observability-summary-tokens')).toHaveTextContent(
      String(controller.getSnapshot().observability.totalTokens)
    );
  });
});
