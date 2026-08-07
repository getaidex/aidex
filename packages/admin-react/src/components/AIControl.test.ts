// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { AIControl } from './AIControl.js';

afterEach(cleanup);

function makeController(aiControl = new InMemoryAIFeatureControl()) {
  const controller = new AdminController({ connectionManager: new ConnectionManager(), aiControl });
  return { controller, aiControl };
}

describe('AIControl — global toggle', () => {
  it('renders the initial global AI state', () => {
    const { controller } = makeController();
    render(React.createElement(AIControl, { controller }));

    expect(screen.getByRole('checkbox', { name: /ai enabled globally/i })).toBeChecked();
  });

  it('calls setAIEnabled() when toggled, and the DOM reflects the new state', () => {
    const { controller } = makeController();
    render(React.createElement(AIControl, { controller }));

    fireEvent.click(screen.getByRole('checkbox', { name: /ai enabled globally/i }));

    expect(controller.getSnapshot().aiControl.enabled).toBe(false);
    expect(screen.getByRole('checkbox', { name: /ai enabled globally/i })).not.toBeChecked();
  });
});

describe('AIControl — feature list composition', () => {
  it('renders a supplied feature even without an existing override', () => {
    const { controller } = makeController();
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    expect(screen.getByRole('checkbox', { name: 'text-generation' })).toBeInTheDocument();
  });

  it('renders an existing feature override even when not supplied via props', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('structured-output', false);
    render(React.createElement(AIControl, { controller }));

    expect(screen.getByRole('checkbox', { name: 'structured-output' })).toBeInTheDocument();
  });

  it('merges supplied features with existing overrides, without duplicates', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('text-generation', false);
    render(
      React.createElement(AIControl, { controller, features: ['text-generation', 'structured-output'] })
    );

    expect(screen.getAllByRole('checkbox', { name: 'text-generation' })).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'structured-output' })).toBeInTheDocument();
  });

  it('orders features deterministically: declared order first, then additional overridden features', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('structured-output', false);
    render(
      React.createElement(AIControl, { controller, features: ['b-feature', 'a-feature'] })
    );

    const rendered = screen.getAllByRole('checkbox').map((el) => el.getAttribute('data-testid'));
    expect(rendered).toEqual([
      'ai-control-global-toggle',
      'ai-control-feature-toggle-b-feature',
      'ai-control-feature-toggle-a-feature',
      'ai-control-feature-toggle-structured-output',
    ]);
  });
});

describe('AIControl — per-feature toggle', () => {
  it('calls setFeatureEnabled() when a feature toggle is changed', () => {
    const { controller } = makeController();
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    fireEvent.click(screen.getByRole('checkbox', { name: 'text-generation' }));

    expect(controller.getSnapshot().aiControl.features).toEqual({ 'text-generation': false });
  });

  it('reflects the new feature state in the DOM after toggling', () => {
    const { controller } = makeController();
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    fireEvent.click(screen.getByRole('checkbox', { name: 'text-generation' }));

    expect(screen.getByRole('checkbox', { name: 'text-generation' })).not.toBeChecked();
  });

  it('shows a feature as unchecked when global AI is disabled, even with no per-feature override', () => {
    const { controller, aiControl } = makeController();
    aiControl.setEnabled(false);
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    expect(screen.getByRole('checkbox', { name: 'text-generation' })).not.toBeChecked();
  });

  it('respects "global disable wins": an enabled feature override still shows unchecked while global is off', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('text-generation', true);
    aiControl.setEnabled(false);
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    expect(screen.getByRole('checkbox', { name: 'text-generation' })).not.toBeChecked();
  });
});

describe('AIControl — clear override', () => {
  it('only renders a clear-override action for features that currently have an override', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('text-generation', false);
    render(
      React.createElement(AIControl, { controller, features: ['text-generation', 'structured-output'] })
    );

    expect(screen.getByTestId('ai-control-feature-clear-text-generation')).toBeInTheDocument();
    expect(screen.queryByTestId('ai-control-feature-clear-structured-output')).not.toBeInTheDocument();
  });

  it('calls clearFeatureOverride() when clicked', () => {
    const { controller, aiControl } = makeController();
    aiControl.setFeatureEnabled('text-generation', false);
    render(React.createElement(AIControl, { controller, features: ['text-generation'] }));

    fireEvent.click(screen.getByTestId('ai-control-feature-clear-text-generation'));

    expect(controller.getSnapshot().aiControl.features).toEqual({});
  });
});
