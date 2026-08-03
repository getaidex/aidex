import { DuplicateRegistrationError, type ExecutionContext } from '@aidex/core';
import type { Engine } from '../types/Engine.js';
import { EngineNotFoundError } from '../errors/EngineNotFoundError.js';
import { UnsupportedProviderCapabilityError } from '../errors/UnsupportedProviderCapabilityError.js';
import { missingCapabilities } from '../capabilities/engineSupportsProvider.js';

/**
 * Central, name-keyed registry for Engines — register once, dispatch by id.
 * Provider-agnostic and domain-agnostic: nothing here knows what any given
 * engine does. A future plugin registers a new engine by calling
 * register(engine) with its own Engine object; the registry itself never
 * needs to change to support it (Open-Closed, the same discipline
 * @aidex/core's StrategyRegistry follows).
 */
export class EngineRegistry {
  private readonly engines = new Map<string, Engine>();

  register(engine: Engine): void {
    if (this.engines.has(engine.id)) {
      throw new DuplicateRegistrationError('Engine', engine.id);
    }
    this.engines.set(engine.id, engine);
  }

  unregister(id: string): boolean {
    return this.engines.delete(id);
  }

  has(id: string): boolean {
    return this.engines.has(id);
  }

  get(id: string): Engine | undefined {
    return this.engines.get(id);
  }

  list(): Engine[] {
    return Array.from(this.engines.values());
  }

  async execute<TResult = unknown, TContext = unknown>(
    id: string,
    context: ExecutionContext<TContext>
  ): Promise<TResult> {
    const engine = this.engines.get(id) as Engine<TResult, TContext> | undefined;
    if (!engine) {
      throw new EngineNotFoundError(id);
    }

    const missing = missingCapabilities(engine, context.provider);
    if (missing.length > 0) {
      throw new UnsupportedProviderCapabilityError(engine.id, missing);
    }

    return engine.execute(context);
  }
}
