// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { AdminOverview } from './AdminOverview.js';
import { AIControl } from './AIControl.js';

afterEach(cleanup);

function makeController() {
  return new AdminController({ connectionManager: new ConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
}

describe('AdminOverview', () => {
  it('renders the initial health from the snapshot', () => {
    const controller = makeController();
    render(React.createElement(AdminOverview, { controller }));

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ok');
  });

  it('updates when underlying Admin state changes', () => {
    const controller = makeController();
    render(React.createElement(AdminOverview, { controller }));

    act(() => {
      controller.setAIEnabled(false);
    });

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ai-disabled');
  });

  it('renders health derived only from AdminSnapshot, not a second calculation', () => {
    const controller = makeController();
    render(React.createElement(AdminOverview, { controller }));

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent(controller.getSnapshot().health);
  });

  it('applies the className prop to the root element', () => {
    const controller = makeController();
    render(React.createElement(AdminOverview, { controller, className: 'custom' }));

    expect(screen.getByTestId('admin-overview')).toHaveClass('custom');
  });
});

describe('AdminOverview — cross-component consistency (no duplicated Admin state)', () => {
  it('reflects a change made through AIControl on the same controller', () => {
    const controller = makeController();
    render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AIControl, { controller }),
        React.createElement(AdminOverview, { controller })
      )
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /ai enabled globally/i }));

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ai-disabled');
  });

  it('two independent controllers do not cross-talk', () => {
    const controllerA = makeController();
    const controllerB = makeController();
    render(React.createElement(AdminOverview, { controller: controllerA }));
    const { unmount } = render(React.createElement(AdminOverview, { controller: controllerB }));

    act(() => {
      controllerA.setAIEnabled(false);
    });

    expect(controllerB.getSnapshot().health).toBe('ok');
    unmount();
  });
});

describe('AdminOverview — React StrictMode', () => {
  it('renders and updates correctly under StrictMode', () => {
    const controller = makeController();
    render(React.createElement(React.StrictMode, null, React.createElement(AdminOverview, { controller })));

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ok');

    act(() => {
      controller.setAIEnabled(false);
    });

    expect(screen.getByTestId('admin-overview-health')).toHaveTextContent('Health: ai-disabled');
  });
});

describe('AdminOverview — mount/unmount', () => {
  it('mounts and unmounts cleanly with no error, and stops updating after unmount', () => {
    const controller = makeController();
    const { unmount } = render(React.createElement(AdminOverview, { controller }));

    expect(() => unmount()).not.toThrow();
    expect(() => controller.setAIEnabled(false)).not.toThrow();
  });
});
