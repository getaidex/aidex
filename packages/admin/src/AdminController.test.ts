import { describe, expect, it, vi } from 'vitest';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { AdminConfigurationError } from './errors/AdminConfigurationError.js';
import { AdminController } from './AdminController.js';

function makeConnectionManager(): ConnectionManager {
  const manager = new ConnectionManager();
  manager.registerProviderFactory('stub', () => ({
    name: 'stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  }));
  return manager;
}

describe('AdminController — construction', () => {
  it('throws AdminConfigurationError when connectionManager is missing', () => {
    expect(
      () =>
        new AdminController({
          connectionManager: undefined as unknown as ConnectionManager,
          aiControl: new InMemoryAIFeatureControl(),
        })
    ).toThrow(AdminConfigurationError);
  });

  it('throws AdminConfigurationError when aiControl is missing', () => {
    expect(
      () =>
        new AdminController({
          connectionManager: makeConnectionManager(),
          aiControl: undefined as unknown as InMemoryAIFeatureControl,
        })
    ).toThrow(AdminConfigurationError);
  });

  it('constructs successfully with just connectionManager + aiControl (observability optional)', () => {
    const admin = new AdminController({
      connectionManager: makeConnectionManager(),
      aiControl: new InMemoryAIFeatureControl(),
    });
    expect(admin.getSnapshot()).toBeDefined();
  });
});

describe('AdminController — getSnapshot()', () => {
  it('reflects live ConnectionManager state, exactly the safe Connection projection', () => {
    const connectionManager = makeConnectionManager();
    connectionManager.register({ id: 'conn-1', providerType: 'stub', config: { apiKey: 'secret-123' } });
    const admin = new AdminController({ connectionManager, aiControl: new InMemoryAIFeatureControl() });

    const snapshot = admin.getSnapshot();

    expect(snapshot.connections).toEqual([{ id: 'conn-1', providerType: 'stub', enabled: true, metadata: undefined }]);
  });

  it('reflects live AIFeatureControl state', () => {
    const aiControl = new InMemoryAIFeatureControl();
    aiControl.setFeatureEnabled('text-generation', false);
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl });

    expect(admin.getSnapshot().aiControl).toEqual({
      enabled: true,
      features: { 'text-generation': false },
    });
  });

  it('defaults observability summary when no ObservabilityBus is supplied', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    expect(admin.getSnapshot().observability).toEqual({ errorCount: 0 });
  });

  it('is a fresh object on every call — not a cached/shared reference', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    expect(admin.getSnapshot()).not.toBe(admin.getSnapshot());
    expect(admin.getSnapshot()).toEqual(admin.getSnapshot());
  });
});

describe('AdminController — health derivation', () => {
  it('is "ok" with no connections and AI enabled', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    expect(admin.getSnapshot().health).toBe('ok');
  });

  it('is "ai-disabled" when AI is globally disabled, regardless of connections', () => {
    const admin = new AdminController({
      connectionManager: makeConnectionManager(),
      aiControl: new InMemoryAIFeatureControl({ enabled: false }),
    });
    expect(admin.getSnapshot().health).toBe('ai-disabled');
  });

  it('is "no-enabled-connections" when every registered connection is disabled', () => {
    const connectionManager = makeConnectionManager();
    connectionManager.register({ id: 'c1', providerType: 'stub', config: {}, enabled: false });
    const admin = new AdminController({ connectionManager, aiControl: new InMemoryAIFeatureControl() });
    expect(admin.getSnapshot().health).toBe('no-enabled-connections');
  });

  it('is "ok" when at least one connection is enabled', () => {
    const connectionManager = makeConnectionManager();
    connectionManager.register({ id: 'c1', providerType: 'stub', config: {}, enabled: false });
    connectionManager.register({ id: 'c2', providerType: 'stub', config: {}, enabled: true });
    const admin = new AdminController({ connectionManager, aiControl: new InMemoryAIFeatureControl() });
    expect(admin.getSnapshot().health).toBe('ok');
  });

  it('prioritizes "ai-disabled" over "no-enabled-connections" when both apply', () => {
    const connectionManager = makeConnectionManager();
    connectionManager.register({ id: 'c1', providerType: 'stub', config: {}, enabled: false });
    const admin = new AdminController({
      connectionManager,
      aiControl: new InMemoryAIFeatureControl({ enabled: false }),
    });
    expect(admin.getSnapshot().health).toBe('ai-disabled');
  });
});

describe('AdminController — connection commands (thin delegation to ConnectionManager)', () => {
  it('registerConnection() delegates and the result appears in the next snapshot', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });

    const connection = admin.registerConnection({ id: 'c1', providerType: 'stub', config: { apiKey: 'x' } });

    expect(connection).toEqual({ id: 'c1', providerType: 'stub', enabled: true, metadata: undefined });
    expect(admin.getSnapshot().connections).toEqual([connection]);
  });

  it('updateConnection()/enableConnection()/disableConnection()/removeConnection() delegate correctly', () => {
    const connectionManager = makeConnectionManager();
    const admin = new AdminController({ connectionManager, aiControl: new InMemoryAIFeatureControl() });
    admin.registerConnection({ id: 'c1', providerType: 'stub', config: {} });

    const disabled = admin.disableConnection('c1');
    expect(disabled.enabled).toBe(false);

    const enabled = admin.enableConnection('c1');
    expect(enabled.enabled).toBe(true);

    const updated = admin.updateConnection('c1', { metadata: { tenant: 'acme' } });
    expect(updated.metadata).toEqual({ tenant: 'acme' });

    expect(admin.removeConnection('c1')).toBe(true);
    expect(admin.getSnapshot().connections).toEqual([]);
  });

  it('propagates ConnectionManager errors untouched — no wrapping', async () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });

    // ConnectionNotFoundError from the underlying ConnectionManager, not a
    // new Admin-specific error class.
    let caught: unknown;
    try {
      admin.enableConnection('does-not-exist');
    } catch (error) {
      caught = error;
    }
    expect((caught as Error).name).toBe('ConnectionNotFoundError');
  });

  it('registering a disabled connection is reflected in health', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    admin.registerConnection({ id: 'c1', providerType: 'stub', config: {}, enabled: false });
    expect(admin.getSnapshot().health).toBe('no-enabled-connections');
  });
});

describe('AdminController — AI control commands (thin delegation to AIFeatureControl)', () => {
  it('setAIEnabled() delegates and is reflected in the next snapshot', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });

    admin.setAIEnabled(false);
    expect(admin.getSnapshot().aiControl.enabled).toBe(false);

    admin.setAIEnabled(true);
    expect(admin.getSnapshot().aiControl.enabled).toBe(true);
  });

  it('setFeatureEnabled() / clearFeatureOverride() delegate correctly', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });

    admin.setFeatureEnabled('text-generation', false);
    expect(admin.getSnapshot().aiControl.features).toEqual({ 'text-generation': false });

    admin.clearFeatureOverride('text-generation');
    expect(admin.getSnapshot().aiControl.features).toEqual({});
  });

  it('repeated identical updates are idempotent', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    admin.setAIEnabled(false);
    admin.setAIEnabled(false);
    admin.setAIEnabled(false);
    expect(admin.getSnapshot().aiControl.enabled).toBe(false);
  });
});

describe('AdminController — observability summary (pure reducer over getTimeline())', () => {
  it('is all-zero/undefined for an empty timeline', () => {
    const observability = new ObservabilityBus();
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });

    expect(admin.getSnapshot().observability).toEqual({ errorCount: 0 });
  });

  it('sums tokens and cost, and counts errors, across mixed events', () => {
    const observability = new ObservabilityBus();
    observability.trackTokens({ totalTokens: 100 });
    observability.trackTokens({ totalTokens: 50 });
    observability.trackCost({ totalCost: 0.02 });
    observability.trackCost({ totalCost: 0.01 });
    observability.trackError({ error: new Error('boom') });
    observability.trackDuration({ durationMs: 5 }); // ignored by the reducer — not tokens/cost/error

    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });
    const summary = admin.getSnapshot().observability;

    expect(summary.totalTokens).toBe(150);
    expect(summary.totalCostUsd).toBeCloseTo(0.03);
    expect(summary.errorCount).toBe(1);
  });

  it('ignores malformed/missing metadata rather than throwing', () => {
    const observability = new ObservabilityBus();
    observability.trackTokens({}); // no totalTokens field
    observability.emit({ event: 'cost' }); // no metadata at all

    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });
    const summary = admin.getSnapshot().observability;

    expect(summary.totalTokens).toBeUndefined();
    expect(summary.totalCostUsd).toBeUndefined();
  });

  it('sets lastEventAt after an event arrives, and leaves it unset before any event', () => {
    const observability = new ObservabilityBus();
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });

    expect(admin.getSnapshot().observability.lastEventAt).toBeUndefined();

    observability.trackTokens({ totalTokens: 1 });

    expect(admin.getSnapshot().observability.lastEventAt).toBeTypeOf('string');
  });

  it('never echoes the raw error value into the summary — only a count', () => {
    const observability = new ObservabilityBus();
    const sensitiveError = new Error('contains api-key sk-secret-abc');
    observability.trackError({ error: sensitiveError });

    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });
    const summary = admin.getSnapshot().observability;

    expect(JSON.stringify(summary)).not.toContain('sk-secret-abc');
    expect(summary.errorCount).toBe(1);
  });

  it('reacts to observability events arriving after AdminController construction', () => {
    const observability = new ObservabilityBus();
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });

    expect(admin.getSnapshot().observability.errorCount).toBe(0);
    observability.trackError({ error: new Error('later') });
    expect(admin.getSnapshot().observability.errorCount).toBe(1);
  });
});

describe('AdminController — subscriptions', () => {
  it('subscribe() returns an unsubscribe function', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const unsubscribe = admin.subscribe(() => {});
    expect(typeof unsubscribe).toBe('function');
  });

  it('fires with a fresh snapshot after a connection command', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const listener = vi.fn();
    admin.subscribe(listener);

    admin.registerConnection({ id: 'c1', providerType: 'stub', config: {} });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].connections).toEqual([{ id: 'c1', providerType: 'stub', enabled: true, metadata: undefined }]);
  });

  it('fires after an AI-control command', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const listener = vi.fn();
    admin.subscribe(listener);

    admin.setAIEnabled(false);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].aiControl.enabled).toBe(false);
  });

  it('fires after an observability event when observability is supplied', () => {
    const observability = new ObservabilityBus();
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl(), observability });
    const listener = vi.fn();
    admin.subscribe(listener);

    observability.trackTokens({ totalTokens: 10 });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports multiple independent subscribers', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const first = vi.fn();
    const second = vi.fn();
    admin.subscribe(first);
    admin.subscribe(second);

    admin.setAIEnabled(false);

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe stops only that listener, leaving others intact (subscriber isolation)', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = admin.subscribe(first);
    admin.subscribe(second);

    unsubscribeFirst();
    admin.setAIEnabled(false);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not leak a shared mutable snapshot reference across calls', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    let seen: unknown;
    admin.subscribe((snapshot) => {
      seen = snapshot;
    });

    admin.setAIEnabled(false);
    const afterFirst = seen;
    admin.setAIEnabled(true);

    expect(seen).not.toBe(afterFirst);
  });

  it('correctness does not depend on subscriptions — commands work identically with zero subscribers', () => {
    const admin = new AdminController({ connectionManager: makeConnectionManager(), aiControl: new InMemoryAIFeatureControl() });
    const connection = admin.registerConnection({ id: 'c1', providerType: 'stub', config: {} });
    expect(connection.id).toBe('c1');
    expect(admin.getSnapshot().connections).toHaveLength(1);
  });
});
