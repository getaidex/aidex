/**
 * Vendor-agnostic errors any Provider implementation can translate its own
 * SDK's errors into, so a caller never needs to import a vendor SDK just to
 * tell "bad credentials" apart from "rate limited" apart from "the vendor
 * is down." Lives here (packages/providers/shared), not in @aidex/core —
 * these are a provider-abstraction convention, not a kernel contract.
 */
export class ProviderError extends Error {
  readonly provider: string;
  readonly cause?: unknown;

  constructor(message: string, provider: string, cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.cause = cause;
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(provider: string, cause?: unknown) {
    super(`${provider}: authentication failed`, provider, cause);
    this.name = 'ProviderAuthenticationError';
    Object.setPrototypeOf(this, ProviderAuthenticationError.prototype);
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string, cause?: unknown) {
    super(`${provider}: rate limit exceeded`, provider, cause);
    this.name = 'ProviderRateLimitError';
    Object.setPrototypeOf(this, ProviderRateLimitError.prototype);
  }
}

export class ProviderInvalidRequestError extends ProviderError {
  constructor(provider: string, cause?: unknown) {
    super(`${provider}: invalid request`, provider, cause);
    this.name = 'ProviderInvalidRequestError';
    Object.setPrototypeOf(this, ProviderInvalidRequestError.prototype);
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, cause?: unknown) {
    super(`${provider}: temporarily unavailable`, provider, cause);
    this.name = 'ProviderUnavailableError';
    Object.setPrototypeOf(this, ProviderUnavailableError.prototype);
  }
}
