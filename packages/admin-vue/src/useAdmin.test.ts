import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, shallowRef } from 'vue';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { useAdmin } from './useAdmin.js';

function makeController(observability = new ObservabilityBus()) {
  const connectionManager = new ConnectionManager();
  connectionManager.registerProviderFactory('stub', () => ({
    name: 'stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  }));
  const aiControl = new InMemoryAIFeatureControl();
  const controller = new AdminController({ connectionManager, aiControl, observability });
  return { controller, connectionManager, aiControl, observability };
}

/** Runs `fn` inside a disposable Vue effect scope — the composable-testing equivalent of mounting/unmounting a component. */
function withScope<T>(fn: () => T): { result: T; dispose: () => void } {
  const scope = effectScope();
  const result = scope.run(fn) as T;
  return { result, dispose: () => scope.stop() };
}

describe('useAdmin — reactive snapshot', () => {
  it('1. initial snapshot is available immediately, matching controller.getSnapshot()', () => {
    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    expect(snapshot.value).toEqual(controller.getSnapshot());
  });

  it('2. AI global state update propagates', () => {
    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    controller.setAIEnabled(false);

    expect(snapshot.value.aiControl.enabled).toBe(false);
    expect(snapshot.value.health).toBe('ai-disabled');
  });

  it('3. feature state update propagates', () => {
    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    controller.setFeatureEnabled('text-generation', false);

    expect(snapshot.value.aiControl.features).toEqual({ 'text-generation': false });
  });

  it('4. connection update propagates', () => {
    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    controller.registerConnection({ id: 'c1', providerType: 'stub', config: {} });
    expect(snapshot.value.connections).toHaveLength(1);

    controller.disableConnection('c1');
    expect(snapshot.value.connections[0]?.enabled).toBe(false);

    controller.removeConnection('c1');
    expect(snapshot.value.connections).toEqual([]);
  });

  it('5. observability update propagates', () => {
    const { controller, observability } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    observability.trackTokens({ totalTokens: 42 });

    expect(snapshot.value.observability.totalTokens).toBe(42);
  });
});

describe('useAdmin — subscription cleanup', () => {
  it('6. disposing the scope stops further updates', () => {
    const { controller } = makeController();
    const { result: snapshot, dispose } = withScope(() => useAdmin(controller));

    dispose();
    const frozen = snapshot.value;
    controller.setAIEnabled(false);

    expect(snapshot.value).toBe(frozen);
    expect(snapshot.value.aiControl.enabled).toBe(true);
  });

  it('unsubscribes from the controller exactly once on scope disposal', () => {
    const { controller } = makeController();
    const unsubscribeSpy = vi.fn();
    const realSubscribe = controller.subscribe.bind(controller);
    vi.spyOn(controller, 'subscribe').mockImplementation((listener) => {
      const realUnsubscribe = realSubscribe(listener);
      return () => {
        unsubscribeSpy();
        realUnsubscribe();
      };
    });

    const { dispose } = withScope(() => useAdmin(controller));

    expect(unsubscribeSpy).not.toHaveBeenCalled();
    dispose();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useAdmin — multiple consumers/controllers', () => {
  it('7. multiple consumers sharing one controller stay synchronized', () => {
    const { controller } = makeController();
    const { result: snapshotA } = withScope(() => useAdmin(controller));
    const { result: snapshotB } = withScope(() => useAdmin(controller));

    controller.setAIEnabled(false);

    expect(snapshotA.value.aiControl.enabled).toBe(false);
    expect(snapshotB.value.aiControl.enabled).toBe(false);
  });

  it('8. independent controllers do not cross-talk', () => {
    const first = makeController();
    const second = makeController();
    const { result: snapshotA } = withScope(() => useAdmin(first.controller));
    const { result: snapshotB } = withScope(() => useAdmin(second.controller));

    first.controller.setAIEnabled(false);

    expect(snapshotA.value.aiControl.enabled).toBe(false);
    expect(snapshotB.value.aiControl.enabled).toBe(true);
  });
});

describe('useAdmin — command errors', () => {
  it('9. errors from controller commands propagate unchanged and do not corrupt the reactive snapshot', () => {
    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    let caught: unknown;
    try {
      controller.enableConnection('does-not-exist');
    } catch (error) {
      caught = error;
    }

    expect((caught as Error).name).toBe('ConnectionNotFoundError');
    // The reactive snapshot is unaffected by the failed command and still tracks the controller correctly.
    controller.setAIEnabled(false);
    expect(snapshot.value.aiControl.enabled).toBe(false);
  });
});

describe('useAdmin — controller replacement', () => {
  it('10. accepts a reactive controller source and switches subscriptions when it changes', () => {
    const first = makeController();
    const second = makeController();
    // shallowRef, not ref: AdminController transitively holds
    // ConnectionManager's true-private #connections field, and Vue's deep
    // reactive() proxying (what a plain ref() applies to object values)
    // breaks native private-field access through a Proxy. shallowRef never
    // wraps its held value, which is also Vue's own documented guidance for
    // holding class instances/opaque objects.
    const activeController = shallowRef(first.controller);
    const { result: snapshot } = withScope(() =>
      useAdmin(() => activeController.value)
    );

    expect(snapshot.value).toEqual(first.controller.getSnapshot());

    activeController.value = second.controller;
    expect(snapshot.value).toEqual(second.controller.getSnapshot());

    // No longer subscribed to the first controller.
    first.controller.setAIEnabled(false);
    expect(snapshot.value.aiControl.enabled).toBe(true);

    // Subscribed to the second controller now.
    second.controller.setAIEnabled(false);
    expect(snapshot.value.aiControl.enabled).toBe(false);
  });

  it('a plain (non-reactive) controller argument behaves as a fixed controller for the composable\'s lifetime', () => {
    const { controller } = makeController();
    const computedController = computed(() => controller);
    const { result: snapshot } = withScope(() => useAdmin(computedController));

    controller.setAIEnabled(false);
    expect(snapshot.value.aiControl.enabled).toBe(false);
  });
});

describe('useAdmin — SSR / no browser globals', () => {
  it('11. works with no window/document present', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');

    const { controller } = makeController();
    const { result: snapshot } = withScope(() => useAdmin(controller));

    expect(snapshot.value.health).toBe('ok');
  });
});
