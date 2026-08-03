/**
 * Thrown by AIBuilder.build() when no provider was configured — via
 * .provider() or the constructor AIConfiguration — before build() was
 * called.
 */
export class MissingProviderError extends Error {
  constructor() {
    super('AIBuilder.build() requires a provider. Call .provider(provider) before .build().');
    this.name = 'MissingProviderError';
    Object.setPrototypeOf(this, MissingProviderError.prototype);
  }
}
