import { describe, expect, it, vi } from 'vitest';
import type { DestroyRef } from '@angular/core';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { AdminService } from './AdminService.js';

/**
 * A minimal, structurally-correct DestroyRef — Angular only ever hands out
 * real instances via its DI injector (inject(DestroyRef) inside an
 * injection context), which would require pulling in TestBed/zone.js for
 * what is otherwise plain TS logic. This fake exercises the exact contract
 * AdminService depends on: onDestroy(callback) registers a callback and
 * returns an unregister function; destroy() simulates Angular tearing the
 * consumer down.
 */
class FakeDestroyRef implements DestroyRef {
  destroyed = false;
  private callbacks: Array<() => void> = [];

  onDestroy(callback: () => void): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((registered) => registered !== callback);
    };
  }

  destroy(): void {
    this.destroyed = true;
    for (const callback of this.callbacks) {
      callback();
    }
  }
}

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

describe('AdminService — reactive snapshot', () => {
  it('1. initial snapshot is available immediately, matching controller.getSnapshot()', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    expect(service.snapshot()).toEqual(controller.getSnapshot());
  });

  it('2. an AdminController command updates the exposed snapshot', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    controller.setAIEnabled(false);

    expect(service.snapshot().aiControl.enabled).toBe(false);
    expect(service.snapshot().health).toBe('ai-disabled');
  });

  it('3. an observability event updates the exposed snapshot', () => {
    const { controller, observability } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    observability.trackTokens({ totalTokens: 42 });

    expect(service.snapshot().observability.totalTokens).toBe(42);
  });

  it('4. AI global enable/disable propagates', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    service.setAIEnabled(false);
    expect(service.snapshot().aiControl.enabled).toBe(false);

    service.setAIEnabled(true);
    expect(service.snapshot().aiControl.enabled).toBe(true);
  });

  it('5. feature enable/disable propagates, including clearFeatureOverride', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    service.setFeatureEnabled('text-generation', false);
    expect(service.snapshot().aiControl.features).toEqual({ 'text-generation': false });

    service.clearFeatureOverride('text-generation');
    expect(service.snapshot().aiControl.features).toEqual({});
  });

  it('6. connection register/enable/disable/remove propagates', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    const connection = service.registerConnection({ id: 'c1', providerType: 'stub', config: {} });
    expect(connection.enabled).toBe(true);
    expect(service.snapshot().connections).toEqual([connection]);

    service.disableConnection('c1');
    expect(service.snapshot().connections[0]?.enabled).toBe(false);

    service.enableConnection('c1');
    expect(service.snapshot().connections[0]?.enabled).toBe(true);

    service.updateConnection('c1', { metadata: { tenant: 'acme' } });
    expect(service.snapshot().connections[0]?.metadata).toEqual({ tenant: 'acme' });

    expect(service.removeConnection('c1')).toBe(true);
    expect(service.snapshot().connections).toEqual([]);
  });
});

describe('AdminService — command delegation (no duplicated logic)', () => {
  it('7. every command delegates to the exact same AdminController instance, not a copy', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    service.setAIEnabled(false);

    // Read the underlying controller directly — proves the service has no
    // parallel state; the mutation is visible through the real controller.
    expect(controller.getSnapshot().aiControl.enabled).toBe(false);
  });

  it('propagates errors from AdminController commands untouched — no wrapping', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());

    expect(() => service.enableConnection('does-not-exist')).toThrow();
    let caught: unknown;
    try {
      service.enableConnection('does-not-exist');
    } catch (error) {
      caught = error;
    }
    expect((caught as Error).name).toBe('ConnectionNotFoundError');
  });
});

describe('AdminService — Angular lifecycle cleanup', () => {
  it('8. registers exactly one destroy callback that unsubscribes from AdminController', () => {
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
    const destroyRef = new FakeDestroyRef();
    new AdminService(controller, destroyRef);

    expect(unsubscribeSpy).not.toHaveBeenCalled();
    destroyRef.destroy();
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('9. destroying the consumer stops further snapshot updates', () => {
    const { controller } = makeController();
    const destroyRef = new FakeDestroyRef();
    const service = new AdminService(controller, destroyRef);

    destroyRef.destroy();
    const frozen = service.snapshot();

    controller.setAIEnabled(false);

    expect(service.snapshot()).toBe(frozen);
    expect(service.snapshot().aiControl.enabled).toBe(true);
  });
});

describe('AdminService — multiple instances/controllers', () => {
  it('10. two services on the same controller stay synchronized (no duplicated state)', () => {
    const { controller } = makeController();
    const serviceA = new AdminService(controller, new FakeDestroyRef());
    const serviceB = new AdminService(controller, new FakeDestroyRef());

    serviceA.setAIEnabled(false);

    expect(serviceB.snapshot().aiControl.enabled).toBe(false);
  });

  it('two services on independent controllers do not cross-talk', () => {
    const first = makeController();
    const second = makeController();
    const serviceA = new AdminService(first.controller, new FakeDestroyRef());
    const serviceB = new AdminService(second.controller, new FakeDestroyRef());

    serviceA.setAIEnabled(false);

    expect(serviceB.snapshot().aiControl.enabled).toBe(true);
  });

  it('11. no duplicated Admin state — snapshot always reflects live controller reads, not a cached copy from construction time', () => {
    const { controller } = makeController();
    const service = new AdminService(controller, new FakeDestroyRef());
    const initial = service.snapshot();

    controller.registerConnection({ id: 'c1', providerType: 'stub', config: {} });

    expect(service.snapshot()).not.toBe(initial);
    expect(service.snapshot().connections).toHaveLength(1);
  });
});
