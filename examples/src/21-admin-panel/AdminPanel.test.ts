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

describe('AdminPanel — real-world Admin architecture flow', () => {
  it('1. renders the initial Admin state', () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.getByTestId('health')).toHaveTextContent('ok');
    expect(screen.getByTestId('ai-enabled-toggle')).toBeChecked();
    expect(screen.getByTestId('feature-enabled-toggle')).toBeChecked();
    expect(screen.getByTestId('connection-primary')).toHaveTextContent('primary (stub) — enabled');
    expect(screen.getByTestId('observability-tokens')).toHaveTextContent('Total tokens: 0');
    expect(screen.getByTestId('observability-errors')).toHaveTextContent('Errors: 0');
  });

  it('2-5. disabling AI from the UI blocks execution before the provider is called, without breaking the UI', async () => {
    const demo = buildDemo();
    const generateSpy = vi.spyOn(StubProvider.prototype, 'generate');
    renderPanel(demo);

    // 2. Disable AI from UI
    fireEvent.click(screen.getByTestId('ai-enabled-toggle'));
    expect(screen.getByTestId('health')).toHaveTextContent('ai-disabled');

    // 3. Attempt execution
    fireEvent.click(screen.getByTestId('run-button'));

    // 4. Verify controlled AI-disabled failure
    const errorEl = await screen.findByTestId('run-error');
    expect(errorEl).toHaveTextContent('disabled');

    // 5. Verify provider was not invoked
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('6-7. re-enabling AI allows the next execution to succeed', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    fireEvent.click(screen.getByTestId('ai-enabled-toggle')); // disable
    fireEvent.click(screen.getByTestId('run-button'));
    await screen.findByTestId('run-error');

    // 6. Re-enable AI
    fireEvent.click(screen.getByTestId('ai-enabled-toggle'));
    expect(screen.getByTestId('health')).toHaveTextContent('ok');

    // 7. Execute again successfully
    fireEvent.click(screen.getByTestId('run-button'));
    const resultEl = await screen.findByTestId('run-result');
    expect(resultEl).toHaveTextContent('stub:why is the sky blue?');
  });

  it('8-9. disabling a feature blocks only that feature, leaving global AI state untouched', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    // 8. Disable a feature
    fireEvent.click(screen.getByTestId('feature-enabled-toggle'));
    fireEvent.click(screen.getByTestId('run-button'));

    // 9. Verify only that feature is blocked (global AI stays enabled)
    const errorEl = await screen.findByTestId('run-error');
    expect(errorEl).toHaveTextContent(STRATEGY_NAME);
    expect(demo.admin.getSnapshot().aiControl.enabled).toBe(true);
    expect(screen.getByTestId('ai-enabled-toggle')).toBeChecked();
  });

  it('10. connection state appears correctly and reacts to the toggle button', () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.getByTestId('connection-primary')).toHaveTextContent('enabled');

    fireEvent.click(screen.getByTestId('connection-toggle-primary'));
    expect(screen.getByTestId('connection-primary')).toHaveTextContent('disabled');

    fireEvent.click(screen.getByTestId('connection-toggle-primary'));
    expect(screen.getByTestId('connection-primary')).toHaveTextContent('enabled');
  });

  it('11. observability summary updates after a successful run', async () => {
    const demo = buildDemo();
    renderPanel(demo);

    expect(screen.getByTestId('observability-tokens')).toHaveTextContent('Total tokens: 0');

    fireEvent.click(screen.getByTestId('run-button'));
    await screen.findByTestId('run-result');

    await waitFor(() => {
      expect(screen.getByTestId('observability-tokens')).not.toHaveTextContent('Total tokens: 0');
    });
  });
});
