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
export class AbortedError extends Error {
  constructor() {
    super('Aborted');
    this.name = 'AbortedError';
    Object.setPrototypeOf(this, AbortedError.prototype);
  }
}

export function isAborted(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new AbortedError();
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
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    controller.abort();
  });

  return controller.signal;
}

/**
 * Rejects with an "Aborted" error as soon as `signal` fires, racing whichever
 * SDK call `promise` represents. A vendor SDK that honors `AbortSignal`
 * internally will usually reject on its own once aborted; this guarantees the
 * same outcome even when the SDK's own abort handling is slow, absent, or
 * (as in tests) mocked out entirely.
 */
export function rejectOnAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(new AbortedError());
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => reject(new AbortedError());
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
