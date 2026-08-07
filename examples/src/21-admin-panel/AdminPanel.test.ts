// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import React from 'react';
import { StubProvider } from '@aidex/providers';
import { AdminPanel } from './AdminPanel.js';
import { buildDemo, runAI, STRATEGY_NAME, type AdminPanelDemo } from './setup.js';

// vitest.config.ts doesn't set test.globals: true, so @testing-library/
// react's own auto-cleanup (which relies on a global afterEach) never
// registers — without this, each render() below would leave its DOM
// mounted for the next test in this file, causing duplicate testid matches.
afterEach(cleanup);

function renderPanel(demo: AdminPanelDemo) {
  return render(
    React.createElement(AdminPanel, {
      controller: demo.admin,
      onRun: (input: string) => runAI(demo, input),
    })
  );
}

describe('AdminPanel — composes the reusable @aidex/admin-react components', () => {
  it('1. renders the initial Admin state via AdminOverview/AIControl/ConnectionList/ObservabilitySummary', () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ok');
    expect(screen.getByRole('checkbox', { name: /ai enabled globally/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: STRATEGY_NAME })).toBeChecked();
    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent(
      'primary (stub) — enabled'
    );
    expect(screen.getByTestId('observability-summary-errors')).toHaveTextContent('Errors: 0');
    expect(screen.queryByTestId('observability-summary-tokens')).not.toBeInTheDocument();
  });

  it('2-5. disabling AI via AIControl blocks execution before the provider is called, without breaking the UI', async () => {
    const demo = buildDemo();
    const generateSpy = vi.spyOn(StubProvider.prototype, 'generate');
    renderPanel(demo);

    // 2. Disable AI from the reusable AIControl component
    fireEvent.click(screen.getByRole('checkbox', { name: /ai enabled globally/i }));
    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ai-disabled');
    // AdminOverview reads the same controller — no duplicated/stale state.
    expect(demo.admin.getSnapshot().health).toBe('ai-disabled');

    // 3. Attempt execution via the app-specific Run AI section
    fireEvent.click(screen.getByTestId('run-button'));

    // 4. Verify controlled AI-disabled failure
    const errorEl = await screen.findByTestId('run-error');
    expect(errorEl).toHaveTextContent('disabled');

    // 5. Verify provider was not invoked
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('6-7. re-enabling AI via AIControl allows the next execution to succeed', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    fireEvent.click(screen.getByRole('checkbox', { name: /ai enabled globally/i })); // disable
    fireEvent.click(screen.getByTestId('run-button'));
    await screen.findByTestId('run-error');

    // 6. Re-enable AI
    fireEvent.click(screen.getByRole('checkbox', { name: /ai enabled globally/i }));
    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ok');

    // 7. Execute again successfully — existing app-specific Run AI behavior unchanged
    fireEvent.click(screen.getByTestId('run-button'));
    const resultEl = await screen.findByTestId('run-result');
    expect(resultEl).toHaveTextContent('stub:why is the sky blue?');
  });

  it('8-9. disabling a feature via AIControl blocks only that feature, leaving global AI state untouched', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    // 8. Disable the feature
    fireEvent.click(screen.getByRole('checkbox', { name: STRATEGY_NAME }));
    fireEvent.click(screen.getByTestId('run-button'));

    // 9. Verify only that feature is blocked (global AI stays enabled)
    const errorEl = await screen.findByTestId('run-error');
    expect(errorEl).toHaveTextContent(STRATEGY_NAME);
    expect(demo.admin.getSnapshot().aiControl.enabled).toBe(true);
    expect(screen.getByRole('checkbox', { name: /ai enabled globally/i })).toBeChecked();
  });

  it('10. ConnectionList renders connection state and enable/disable actions work', () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('enabled');

    fireEvent.click(screen.getByRole('button', { name: 'Disable connection primary' }));
    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('disabled');
    expect(demo.connectionManager.get('primary')?.enabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Enable connection primary' }));
    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('enabled');
  });

  it('11. ObservabilitySummary updates after a successful AI execution', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.queryByTestId('observability-summary-tokens')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('run-button'));
    await screen.findByTestId('run-result');

    await waitFor(() => {
      expect(screen.getByTestId('observability-summary-tokens')).toBeInTheDocument();
    });
  });
});
