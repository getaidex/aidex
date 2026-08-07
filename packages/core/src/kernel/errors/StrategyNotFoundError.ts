import { AidexError } from '../../errors/AidexError.js';

export class StrategyNotFoundError extends AidexError {
  readonly strategyName: string;

  constructor(strategyName: string, executionId?: string) {
    super(`Strategy not found: "${strategyName}"`, { executionId });
    this.name = 'StrategyNotFoundError';
    this.strategyName = strategyName;
    Object.setPrototypeOf(this, StrategyNotFoundError.prototype);
  }
}
