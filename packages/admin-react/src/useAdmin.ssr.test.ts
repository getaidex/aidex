// Deliberately no environment override comment here — this file runs in
// vitest's default 'node' environment (see root vitest.config.ts), i.e.
// genuinely no window/document/browser globals, unlike useAdmin.test.ts
// (which opts into jsdom). That absence is itself part of what this file
// proves: if useAdmin (or AdminController underneath it) touched a browser
// global, this file would throw a ReferenceError before any assertion ran.
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { useAdmin } from './useAdmin.js';

function makeController() {
  const connectionManager = new ConnectionManager();
  const aiControl = new InMemoryAIFeatureControl();
  return new AdminController({ connectionManager, aiControl });
}

function Harness({ controller }: { controller: AdminController }) {
  const snapshot = useAdmin(controller);
  return React.createElement('span', null, snapshot.health);
}

describe('useAdmin — SSR', () => {
  it('confirms this environment has no browser globals to begin with', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });

  it('renders via getServerSnapshot without throwing and without any browser global', () => {
    const controller = makeController();

    const html = renderToString(React.createElement(Harness, { controller }));

    expect(html).toContain('ok');
  });

  it('server-rendered output reflects live AdminController state at render time', () => {
    const controller = makeController();
    controller.setAIEnabled(false);

    const html = renderToString(React.createElement(Harness, { controller }));

    expect(html).toContain('ai-disabled');
  });
});
