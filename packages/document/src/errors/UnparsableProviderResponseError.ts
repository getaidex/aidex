/**
 * Thrown when a Strategy's provider call succeeds but the response content
 * can't be turned into the strategy's expected Result shape — malformed
 * JSON, or valid JSON missing a required field. Carries the raw content so
 * a caller/logger can inspect what the provider actually said.
 */
export class UnparsableProviderResponseError extends Error {
  readonly strategyName: string;
  readonly rawContent: string;

  constructor(strategyName: string, rawContent: string, reason: string) {
    super(
      `Strategy "${strategyName}" could not parse the provider's response into the expected result shape: ${reason}`
    );
    this.name = 'UnparsableProviderResponseError';
    this.strategyName = strategyName;
    this.rawContent = rawContent;
    Object.setPrototypeOf(this, UnparsableProviderResponseError.prototype);
  }
}
