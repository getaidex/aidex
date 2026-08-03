export class StrategyNotFoundError extends Error {
  readonly strategyName: string;

  constructor(strategyName: string) {
    super(`Strategy not found: "${strategyName}"`);
    this.name = 'StrategyNotFoundError';
    this.strategyName = strategyName;
    Object.setPrototypeOf(this, StrategyNotFoundError.prototype);
  }
}
