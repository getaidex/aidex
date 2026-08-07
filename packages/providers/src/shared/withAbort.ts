import { AidexError } from '@aidex/core';

/**
 * Reusable AidexOptions.signal / .timeout helpers for Provider implementations.
 * Plain functions only — no class, no shared state, composed by whichever
 * provider needs them.
 */

/**
 * Thrown by throwIfAborted()/rejectOnAbort() for our own cancellation —
 * distinguishable via `instanceof` so a provider can tell "the caller
 * cancelled this" apart from a real vendor/network error and skip
 * translating it into a ProviderError.
 */
export class AbortedError extends AidexError {
  constructor(message = 'Aborted') {
    super(message);
    this.name = 'AbortedError';
    Object.setPrototypeOf(this, AbortedError.prototype);
  }
}

/**
 * Thrown instead of a plain AbortedError when the SDK's own timeout deadline
 * (not the caller) is what triggered the abort — set as the AbortSignal's
 * `.reason` by withTimeoutSignal()'s internal timer, and detected by
 * throwIfAborted()/rejectOnAbort() below. Extends AbortedError (rather than
 * AidexError directly) so pre-existing `instanceof AbortedError` handling
 * for "the request was aborted, for any reason" keeps matching timeouts too
 * — `instanceof TimeoutError` remains available for code that wants to
 * discriminate the two cases specifically.
 */
export class TimeoutError extends AbortedError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

function abortErrorFor(signal: AbortSignal): AbortedError | TimeoutError {
  return signal.reason instanceof TimeoutError ? signal.reason : new AbortedError();
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw abortErrorFor(signal);
  }
}

/**
 * Combines an optional upstream AbortSignal with an optional timeout into a
 * single AbortSignal a provider's SDK call can be given. Returns the original
 * signal unchanged when no timeout is set.
 */
export function withTimeoutSignal(timeoutMs?: number, signal?: AbortSignal): AbortSignal | undefined {
  if (timeoutMs === undefined) {
    return signal;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeoutError(timeoutMs)), timeoutMs);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    controller.abort();
  });

  return controller.signal;
}

/**
 * Rejects with an "Aborted"/"Timed out" error as soon as `signal` fires,
 * racing whichever SDK call `promise` represents. A vendor SDK that honors
 * `AbortSignal` internally will usually reject on its own once aborted;
 * this guarantees the same outcome even when the SDK's own abort handling
 * is slow, absent, or (as in tests) mocked out entirely.
 */
export function rejectOnAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(abortErrorFor(signal));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(abortErrorFor(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      }
    );
  });
}
