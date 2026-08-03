/**
 * Thrown by PromptRegistry.register() when a PromptTemplate's basic shape
 * is invalid (empty id/version/template) — a fail-loud validation check at
 * registration time, before the prompt ever enters the registry.
 */
export class InvalidPromptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPromptError';
    Object.setPrototypeOf(this, InvalidPromptError.prototype);
  }
}
