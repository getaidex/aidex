// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ConnectionList } from './ConnectionList.js';

afterEach(cleanup);

function makeController() {
  const connectionManager = new ConnectionManager();
  connectionManager.registerProviderFactory('stub', () => ({
    name: 'stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  }));
  const controller = new AdminController({ connectionManager, aiControl: new InMemoryAIFeatureControl() });
  return { controller, connectionManager };
}

describe('ConnectionList', () => {
  it('renders connections from the snapshot: identity, provider type, and enabled status', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {} });
    render(React.createElement(ConnectionList, { controller }));

    const item = screen.getByTestId('connection-list-item-primary');
    expect(item).toHaveTextContent('primary');
    expect(item).toHaveTextContent('stub');
    expect(item).toHaveTextContent('enabled');
  });

  it('renders a disabled connection\'s status correctly', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {}, enabled: false });
    render(React.createElement(ConnectionList, { controller }));

    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('disabled');
  });

  it('disable action calls AdminController.disableConnection() and updates the DOM', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {} });
    render(React.createElement(ConnectionList, { controller }));

    fireEvent.click(screen.getByRole('button', { name: 'Disable connection primary' }));

    expect(controller.getSnapshot().connections[0]?.enabled).toBe(false);
    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('disabled');
  });

  it('enable action calls AdminController.enableConnection() and updates the DOM', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {}, enabled: false });
    render(React.createElement(ConnectionList, { controller }));

    fireEvent.click(screen.getByRole('button', { name: 'Enable connection primary' }));

    expect(controller.getSnapshot().connections[0]?.enabled).toBe(true);
    expect(screen.getByTestId('connection-list-item-primary')).toHaveTextContent('enabled');
  });

  it('remove action calls AdminController.removeConnection() and the item disappears', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {} });
    render(React.createElement(ConnectionList, { controller }));

    fireEvent.click(screen.getByRole('button', { name: 'Remove connection primary' }));

    expect(controller.getSnapshot().connections).toEqual([]);
    expect(screen.queryByTestId('connection-list-item-primary')).not.toBeInTheDocument();
  });

  it('exposes accessible names for every action button', () => {
    const { controller, connectionManager } = makeController();
    connectionManager.register({ id: 'primary', providerType: 'stub', config: {} });
    render(React.createElement(ConnectionList, { controller }));

    expect(screen.getByRole('button', { name: 'Disable connection primary' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove connection primary' })).toBeInTheDocument();
  });
});
