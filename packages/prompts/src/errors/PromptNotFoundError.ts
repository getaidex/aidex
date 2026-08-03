/**
 * Thrown by PromptRegistry.render() (and available for any other
 * throwing-lookup use) when no prompt is registered under the given id —
 * or, when a specific version was requested, under that id+version.
 */
export class PromptNotFoundError extends Error {
  readonly promptId: string;
  readonly version?: string;

  constructor(promptId: string, version?: string) {
    super(
      version ? `Prompt not found: "${promptId}@${version}"` : `Prompt not found: "${promptId}"`
    );
    this.name = 'PromptNotFoundError';
    this.promptId = promptId;
    this.version = version;
    Object.setPrototypeOf(this, PromptNotFoundError.prototype);
  }
}
