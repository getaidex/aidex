// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import React from 'react';
import { AdminController } from '@aidex/admin';
import { ConnectionManager } from '@aidex/connections';
import { InMemoryAIFeatureControl } from '@aidex/ai-control';
import { ObservabilityBus } from '@aidex/observability';
import { useAdmin } from './useAdmin.js';

function makeController(withObservability = true) {
  const connectionManager = new ConnectionManager();
  connectionManager.registerProviderFactory('stub', () => ({
    name: 'stub',
    async generate(prompt) {
      return { content: prompt.content };
    },
  }));
  const aiControl = new InMemoryAIFeatureControl();
  const observability = withObservability ? new ObservabilityBus() : undefined;
  const controller = new AdminController({ connectionManager, aiControl, observability });
  return { controller, connectionManager, aiControl, observability };
}

describe('useAdmin — initial snapshot', () => {
  it('returns controller.getSnapshot() on first render', () => {
    const { controller } = makeController();
    const { result } = renderHook(() => useAdmin(controller));
    expect(result.current).toEqual(controller.getSnapshot());
  });
});

describe('useAdmin — reacts to AdminController changes', () => {
  it('re-renders when AI global state changes', () => {
    const { controller } = makeController();
    const { result } = renderHook(() => useAdmin(controller));

    act(() => {
      controller.setAIEnabled(false);
    });

    expect(result.current.aiControl.enabled).toBe(false);
  });

  it('re-renders when a feature-level state changes', () => {
    const { controller } = makeController();
    const { result } = renderHook(() => useAdmin(controller));

    act(() => {
      controller.setFeatureEnabled('text-generation', false);
    });

    expect(result.current.aiControl.features).toEqual({ 'text-generation': false });
  });

  it('re-renders when a connection command runs', () => {
    const { controller } = makeController();
    const { result } = renderHook(() => useAdmin(controller));

    act(() => {
      controller.registerConnection({ id: 'c1', providerType: 'stub', config: {} });
    });

    expect(result.current.connections).toEqual([{ id: 'c1', providerType: 'stub', enabled: true, metadata: undefined }]);
  });

  it('re-renders when an observability event arrives', () => {
    const { controller, observability } = makeController();
    const { result } = renderHook(() => useAdmin(controller));

    act(() => {
      observability!.trackTokens({ totalTokens: 42 });
    });

    expect(result.current.observability.totalTokens).toBe(42);
  });
});

describe('useAdmin — unmount behavior', () => {
  it('unsubscribes exactly once on unmount', () => {
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

    const { unmount } = renderHook(() => useAdmin(controller));
    expect(unsubscribeSpy).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('produces no further updates after unmount', () => {
    const { controller } = makeController();
    const { result, unmount } = renderHook(() => useAdmin(controller));
    const beforeUnmount = result.current;

    unmount();
    controller.setAIEnabled(false);

    // result.current is frozen at its last value once unmounted — the hook
    // never touched it again.
    expect(result.current).toBe(beforeUnmount);
    expect(result.current.aiControl.enabled).toBe(true);
  });

  it('does not accumulate listeners across repeated mount/unmount cycles', () => {
    const { controller } = makeController();
    const unsubscribeCalls = { count: 0 };
    const subscribeCalls = { count: 0 };
    const realSubscribe = controller.subscribe.bind(controller);
    vi.spyOn(controller, 'subscribe').mockImplementation((listener) => {
      subscribeCalls.count += 1;
      const realUnsubscribe = realSubscribe(listener);
      return () => {
        unsubscribeCalls.count += 1;
        realUnsubscribe();
      };
    });

    for (let i = 0; i < 5; i++) {
      const { unmount } = renderHook(() => useAdmin(controller));
      unmount();
    }

    expect(subscribeCalls.count).toBe(5);
    expect(unsubscribeCalls.count).toBe(5);
  });
});

describe('useAdmin — multiple components / controllers', () => {
  it('two hooks sharing one controller both update together', () => {
    const { controller } = makeController();
    const a = renderHook(() => useAdmin(controller));
    const b = renderHook(() => useAdmin(controller));

    act(() => {
      controller.setAIEnabled(false);
    });

    expect(a.result.current.aiControl.enabled).toBe(false);
    expect(b.result.current.aiControl.enabled).toBe(false);
  });

  it('two independent controllers do not cross-update', () => {
    const first = makeController();
    const second = makeController();
    const a = renderHook(() => useAdmin(first.controller));
    const b = renderHook(() => useAdmin(second.controller));

    act(() => {
      first.controller.setAIEnabled(false);
    });

    expect(a.result.current.aiControl.enabled).toBe(false);
    expect(b.result.current.aiControl.enabled).toBe(true);
  });
});

describe('useAdmin — React StrictMode', () => {
  it('settles to exactly one live subscription despite StrictMode double-invoking subscribe in dev', () => {
    const { controller } = makeController();
    let liveSubscriptions = 0;
    const realSubscribe = controller.subscribe.bind(controller);
    vi.spyOn(controller, 'subscribe').mockImplementation((listener) => {
      liveSubscriptions += 1;
      const realUnsubscribe = realSubscribe(listener);
      return () => {
        liveSubscriptions -= 1;
        realUnsubscribe();
      };
    });

    const { result, unmount } = renderHook(() => useAdmin(controller), {
      wrapper: React.StrictMode,
    });

    // Whether StrictMode double-invoked subscribe or not, exactly one
    // subscription should be live once mount settles — no leaked extra.
    expect(liveSubscriptions).toBe(1);

    act(() => {
      controller.setAIEnabled(false);
    });
    expect(result.current.aiControl.enabled).toBe(false);

    unmount();
    expect(liveSubscriptions).toBe(0);
  });
});

describe('useAdmin — subscription stability', () => {
  it('does not resubscribe on ordinary re-renders with the same controller', () => {
    const { controller } = makeController();
    const subscribeSpy = vi.spyOn(controller, 'subscribe');

    function Harness({ label }: { label: string }) {
      const snapshot = useAdmin(controller);
      return React.createElement('span', null, `${label}:${snapshot.health}`);
    }

    const { rerender } = render(React.createElement(Harness, { label: 'a' }));
    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    rerender(React.createElement(Harness, { label: 'b' }));
    rerender(React.createElement(Harness, { label: 'c' }));

    expect(subscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when the controller instance itself changes', () => {
    const first = makeController();
    const second = makeController();
    const subscribeSpyA = vi.spyOn(first.controller, 'subscribe');
    const subscribeSpyB = vi.spyOn(second.controller, 'subscribe');

    const { rerender } = renderHook(({ controller }) => useAdmin(controller), {
      initialProps: { controller: first.controller },
    });
    expect(subscribeSpyA).toHaveBeenCalledTimes(1);
    expect(subscribeSpyB).not.toHaveBeenCalled();

    rerender({ controller: second.controller });

    expect(subscribeSpyB).toHaveBeenCalledTimes(1);
  });
});
