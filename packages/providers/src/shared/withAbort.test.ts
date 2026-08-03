import { describe, expect, it, vi } from 'vitest';
import {
  AbortedError,
  isAborted,
  rejectOnAbort,
  throwIfAborted,
  withTimeoutSignal,
} from './withAbort.js';

describe('isAborted', () => {
  it('returns false for an undefined signal', () => {
    expect(isAborted(undefined)).toBe(false);
  });

  it('returns false for a signal that has not fired', () => {
    expect(isAborted(new AbortController().signal)).toBe(false);
  });

  it('returns true once the signal has fired', () => {
    const controller = new AbortController();
    controller.abort();
    expect(isAborted(controller.signal)).toBe(true);
  });
});

describe('throwIfAborted', () => {
  it('does nothing for an undefined signal', () => {
    expect(() => throwIfAborted(undefined)).not.toThrow();
  });

  it('does nothing for a signal that has not fired', () => {
    expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
  });

  it('throws AbortedError once the signal has fired', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(AbortedError);
  });
});

describe('withTimeoutSignal', () => {
  it('returns the original signal unchanged when no timeout is given', () => {
    const signal = new AbortController().signal;
    expect(withTimeoutSignal(undefined, signal)).toBe(signal);
  });

  it('returns undefined when neither timeout nor signal is given', () => {
    expect(withTimeoutSignal(undefined, undefined)).toBeUndefined();
  });

  it('returns a new signal that fires once the timeout elapses', async () => {
    vi.useFakeTimers();
    try {
      const merged = withTimeoutSignal(50, undefined);
      expect(merged?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(50);

      expect(merged?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires the merged signal immediately if the upstream signal aborts first', () => {
    const controller = new AbortController();
    const merged = withTimeoutSignal(10_000, controller.signal);

    controller.abort();

    expect(merged?.aborted).toBe(true);
  });
});

describe('rejectOnAbort', () => {
  it('returns the original promise unchanged when no signal is given', async () => {
    const promise = Promise.resolve('value');
    await expect(rejectOnAbort(promise, undefined)).resolves.toBe('value');
  });

  it('rejects immediately with AbortedError if the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(rejectOnAbort(Promise.resolve('value'), controller.signal)).rejects.toBeInstanceOf(
      AbortedError
    );
  });

  it('resolves with the promise value when it settles before the signal aborts', async () => {
    const controller = new AbortController();
    await expect(rejectOnAbort(Promise.resolve('value'), controller.signal)).resolves.toBe(
      'value'
    );
  });

  it('rejects with the promise error when it rejects before the signal aborts', async () => {
    const controller = new AbortController();
    const failure = new Error('boom');

    await expect(rejectOnAbort(Promise.reject(failure), controller.signal)).rejects.toBe(failure);
  });

  it('rejects with AbortedError once the signal fires before the promise settles', async () => {
    const controller = new AbortController();
    const never = new Promise(() => {});

    const pending = rejectOnAbort(never, controller.signal);
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(AbortedError);
  });
});
