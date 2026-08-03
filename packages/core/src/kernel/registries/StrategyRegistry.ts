import type { Strategy } from '../../types/Strategy.js';
import { DuplicateRegistrationError } from '../errors/DuplicateRegistrationError.js';

export class StrategyRegistry {
  private readonly strategies = new Map<string, Strategy>();

  register(strategy: Strategy): void {
    if (this.strategies.has(strategy.name)) {
      throw new DuplicateRegistrationError('Strategy', strategy.name);
    }
    this.strategies.set(strategy.name, strategy);
  }

  get(name: string): Strategy | undefined {
    return this.strategies.get(name);
  }

  has(name: string): boolean {
    return this.strategies.has(name);
  }

  list(): Strategy[] {
    return Array.from(this.strategies.values());
  }
}
